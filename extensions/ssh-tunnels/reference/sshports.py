from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from re import I
from typing import List
import subprocess
import signal
import sys
import os


@dataclass
class Process:
    pid: int
    name: str
    args: str


@dataclass
class PortForward:
    src: int
    dst: int
    host: str
    bind: str = None


@dataclass
class Connection:
    host: str
    fwds: List[PortForward] = field(default_factory=list)
    pid: int = None


def dblForkPopen(*args, **kwargs):
    # first fork
    try:
        pid = os.fork()
        if pid > 0:
            # parent process, return and keep running
            return
    except OSError as e:
        sys.exit(1)

    os.setsid()

    # second fork
    try:
        pid = os.fork()
        if pid > 0:
            # exit from second parent
            sys.exit(0)
    except OSError as e:
        sys.exit(1)

    subprocess.Popen(*args, **kwargs)

    os._exit(os.EX_OK)


def processes() -> List[Process]:
    p = subprocess.Popen(['ps', '-eo', 'pid,args'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, _ = p.communicate()
    ps = []
    for line in stdout.splitlines():
        if b'PID' in line: continue
        pid, *args = line.decode().strip().split(' ')
        ps.append(Process(int(pid), Path(args[0]).name, args))
    return ps


def connections() -> List[Connection]:
    '''Returns active ssh sessions with local port forwards.'''
    connections = []
    for proc in processes():
        # filter ssh
        if proc.name == "ssh":
            # parse command line
            fwds = []
            host = None
            args = iter(proc.args[1:])
            for arg in args:
                # parse local forwards
                if arg == "-L":
                    fwd = next(args).split(":")
                    if len(fwd) == 3:
                        fwds.append(PortForward(src=fwd[0], dst=fwd[2], host=fwd[1]))
                    if len(fwd) == 4:
                        fwds.append(PortForward(src=fwd[1], dst=fwd[3], bind=fwd[0], host=fwd[2]))

                # parse host
                if not arg.startswith("-") and host is None:
                    host = arg

            if len(fwds) > 0:
                connections.append(Connection(host, fwds, proc.pid))

    connections.sort(key=lambda v: v.pid)
    return connections


def open(c: Connection):
    '''Opens a new ssh port forwading session.'''
    cmdline = ['/usr/bin/env', 'ssh', '-N']
    for fwd in c.fwds:
        cmdline.append('-L')
        if fwd.bind:
            cmdline.append(f'{fwd.bind}:{fwd.src}:{fwd.host}:{fwd.dst}')
        else:
            cmdline.append(f'{fwd.src}:{fwd.host}:{fwd.dst}')
    cmdline.append(c.host)
    dblForkPopen(cmdline, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return(' '.join(cmdline))


def close(c: Connection):
    os.kill(c.pid, signal.SIGTERM)


def cliOpen(ports: str, host: str):
    c = Connection(host)

    # parse ports
    ports = ports.split(' ')
    for p in ports:
        p = p.split(':')
        if len(p) == 1 and p[0].isnumeric():
            c.fwds.append(PortForward(
                src=int(p[0]),
                dst=int(p[0]),
                host='localhost'
            ))

        elif len(p) == 2 and not p[0].isnumeric() and p[1].isnumeric():
            c.fwds.append(PortForward(
                src=int(p[1]),
                dst=int(p[1]),
                host=p[0]
            ))

        elif len(p) == 2 and p[0].isnumeric() and p[1].isnumeric():
            c.fwds.append(PortForward(
                src=int(p[0]),
                dst=int(p[1]),
                host='localhost'
            ))

        elif len(p) == 3 and p[0].isnumeric() and not p[1].isnumeric() and p[2].isnumeric():
            c.fwds.append(PortForward(
                src=int(p[0]),
                dst=int(p[2]),
                host=p[1]
            ))

        else:
            print("Invalid Ports Expression")
            return 1

    # open connection
    cmdline = open(c)
    print(f'Starting {cmdline}')
    return 0


def cliClose(arg: str):
    try:
        conns = connections()
        idxs = arg.split(' ')
        for i in idxs:
            close(conns[int(i)])
        print('Stopped Connection')
        return 0

    except BaseException as e:
        print('Invalid Connection')
        return 1


def cliStatus():
    cons = connections()

    # host: [(src, dst), ...]
    fwds = defaultdict(list)

    # get all active forwards and group in hosts
    for c in cons:
        # localhost -> connection host
        for fwd in c.fwds:
            host = c.host if fwd.host == 'localhost' else fwd.host
            fwds[host].append((fwd.src, fwd.dst))

    # print results
    for k, v in fwds.items():
        ports = [f'{p[0]}:{p[1]}' if p[0] != p[1] else f'{p[0]}' for p in v]
        print(f'{k} ← [{", ".join(ports)}]', end=" ")

    if len(fwds) == 0:
        print('No Active Connections')

    print()


def cliConnections():
    print('Active Connections:')
    for i, c in enumerate(connections()):
        ports = [f'{f.src}:{f.dst}' if f.host == 'localhost' else f'{f.src}:{f.host}:{f.dst}' for f in c.fwds]
        print(f'[{i}] {c.host} ← [{", ".join(ports)}]')



if __name__ == "__main__":
    if len(sys.argv) == 3:
        _, ports, host = sys.argv
        exit(cliOpen(ports, host))

    if len(sys.argv) == 2:
        exit(cliClose(sys.argv[1]))

    cliStatus()
    




