import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";

interface PortInfo {
  localAddress: string;
  pid: string;
  processName?: string;
}

export const fetchPorts = (setPorts: (ports: PortInfo[]) => void, setLoading: (loading: boolean) => void) => {
    setLoading(true);
    
    exec("netstat -ano -p tcp", (error, stdout, stderr) => {
      if (error) {
        showToast({ style: Toast.Style.Failure, title: "Error al ejecutar netstat", message: String(error) });
        setLoading(false);
        return;
      }
      
      const lines = stdout.split("\n");
      const ports: PortInfo[] = [];
      const pids = new Set<string>();

      // Extraer puertos y PIDs
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 5 && parts[0] === "TCP") {
          const [proto, localAddr, foreignAddr, state, pid] = parts;
          if (state === "LISTENING") {
            ports.push({ localAddress: localAddr, pid });
            pids.add(pid);
          }
        }
      });

      // Obtener nombres de procesos usando tasklist
      if (pids.size > 0) {
        exec("tasklist /fo csv", (error, processStdout, stderr) => {
          if (error) {
            setPorts(ports);
            setLoading(false);
            return;
          }
          
          const processLines = processStdout.split('\n');
          const processMap = new Map<string, string>();
          
          processLines.forEach((line) => {
            // Formato: "Image Name","PID","Session Name","Session#","Mem Usage"
            const match = line.match(/"([^"]+)","(\d+)"/);
            if (match) {
              const processName = match[1];
              const pid = match[2];
              processMap.set(pid, processName);
            }
          });

          // Asignar nombres de procesos a los puertos
          ports.forEach(port => {
            const processName = processMap.get(port.pid);
            if (processName) {
              port.processName = processName;
            }
          });
          
          setPorts(ports);
          setLoading(false);
        });
      } else {
        setPorts(ports);
        setLoading(false);
      }
    });
  };