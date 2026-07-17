// https://github.com/agnat/node_wake_on_lan

import dgram from "dgram";
import net from "net";
import { Buffer } from "buffer";

function allocBuffer(s: number) {
  return Buffer.alloc(s);
}

const mac_bytes = 6;

function createMagicPacket(mac: string) {
  const mac_buffer = allocBuffer(mac_bytes);
  let i;

  if (mac.length == 2 * mac_bytes + (mac_bytes - 1)) {
    mac = mac.replace(new RegExp(mac[2], "g"), "");
  }
  if (mac.length != 2 * mac_bytes || mac.match(/[^a-fA-F0-9]/)) {
    throw new Error("malformed MAC address '" + mac + "'");
  }

  for (i = 0; i < mac_bytes; ++i) {
    mac_buffer[i] = parseInt(mac.substring(2 * i, 2 * (i + 1)), 16);
  }

  const num_macs = 16,
    buffer = allocBuffer((1 + num_macs) * mac_bytes);
  for (i = 0; i < mac_bytes; ++i) {
    buffer[i] = 0xff;
  }
  for (i = 0; i < num_macs; ++i) {
    mac_buffer.copy(buffer, (i + 1) * mac_bytes, 0, mac_buffer.length);
  }
  return buffer;
}
interface WakeOpts {
  address?: string;
  num_packets?: number;
  interval?: number;
  port?: number;
}

export function wake(mac: string, opts?: WakeOpts | undefined, callback?: (error: Error | null) => void | undefined) {
  if (typeof opts === "function") {
    callback = opts;
    opts = undefined;
  }

  opts = opts || {};

  const address = opts["address"] || "255.255.255.255",
    num_packets = opts["num_packets"] || 3,
    interval = opts["interval"] || 100,
    port = opts["port"] || 9,
    magic_packet = createMagicPacket(mac),
    socket = dgram.createSocket(net.isIPv6(address) ? "udp6" : "udp4");
  let i = 0;
  let timer_id: NodeJS.Timeout | undefined = undefined;

  function post_write(error: Error | null) {
    if (error || i === num_packets) {
      try {
        socket.close();
      } catch (ex) {
        error = error || (ex as Error);
      }
      if (timer_id) {
        clearTimeout(timer_id);
      }
      if (callback) {
        callback(error);
      }
    }
  }

  socket.on("error", post_write);

  function sendWoL() {
    i += 1;
    socket.send(magic_packet, 0, magic_packet.length, port, address, post_write);
    if (i < num_packets) {
      timer_id = setTimeout(sendWoL, interval);
    } else {
      timer_id = undefined;
    }
  }
  socket.once("listening", function () {
    socket.setBroadcast(true);
  });
  sendWoL();
}
