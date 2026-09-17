import https from "node:https";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { WiiMAPI } from "./api";
import EventEmitter from "node:events";
import { ClientRequest, IncomingMessage } from "node:http";
import { DeviceChannel, DeviceMode, DeviceType, LoopMode } from "./types";

jest.mock("https", () => ({
  Agent: jest.fn(),
  get: jest.fn(),
}));

const spyOnGet = function (data: string, statusCode: number = 200) {
  const spy = jest.spyOn(https, "get");

  spy.mockImplementation((url, options, callback) => {
    const req = new EventEmitter() as ClientRequest & IncomingMessage;

    callback?.(req);

    process.nextTick(() => {
      req.emit("data", data);
      req.emit("end");
    });

    req.statusCode = statusCode;

    return req;
  });

  return spy;
};

describe("Wiim API", () => {
  const api = new WiiMAPI({ ip: "127.0.0.1", port: 8080 });
  const apiUrl = "https://127.0.0.1:8080/httpapi.asp";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Toggle Play/Pause", async () => {
    const spy = spyOnGet("OK");
    await api.togglePlayPause();
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("setPlayerCmd:onepause")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Next Track", async () => {
    const spy = spyOnGet("OK");
    await api.next();
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("setPlayerCmd:next")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Previous Track", async () => {
    const spy = spyOnGet("OK");
    await api.previous();
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("setPlayerCmd:prev")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Get Volume", async () => {
    const spy = spyOnGet('{"vol":"42"}');
    const volume = await api.getVolume();
    expect(spy).toHaveBeenCalledWith(`${apiUrl}?command=getPlayerStatus`, expect.anything(), expect.anything());
    expect(volume).toBe(42);
  });

  test("Set Volume", async () => {
    const spy = spyOnGet("OK");
    await api.setVolume(200);
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("setPlayerCmd:vol:100")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Volume Up", async () => {
    const spy = jest
      .spyOn(https, "get")
      .mockImplementationOnce((url, options, callback) => {
        const req = new EventEmitter() as ClientRequest & IncomingMessage;
        callback?.(req);
        process.nextTick(() => {
          req.emit("data", '{"vol":"20"}');
          req.emit("end");
        });
        req.statusCode = 200;
        return req;
      })
      .mockImplementationOnce((url, options, callback) => {
        const req = new EventEmitter() as ClientRequest & IncomingMessage;
        callback?.(req);
        process.nextTick(() => {
          req.emit("data", "OK");
          req.emit("end");
        });
        req.statusCode = 200;
        return req;
      });

    await api.volumeUp(10);
    expect(spy).toHaveBeenCalledWith(`${apiUrl}?command=getPlayerStatus`, expect.anything(), expect.anything());
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("setPlayerCmd:vol:30")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Volume Down", async () => {
    const spy = jest
      .spyOn(https, "get")
      .mockImplementationOnce((url, options, callback) => {
        const req = new EventEmitter() as ClientRequest & IncomingMessage;
        callback?.(req);
        process.nextTick(() => {
          req.emit("data", '{"vol":"25"}');
          req.emit("end");
        });
        req.statusCode = 200;
        return req;
      })
      .mockImplementationOnce((url, options, callback) => {
        const req = new EventEmitter() as ClientRequest & IncomingMessage;
        callback?.(req);
        process.nextTick(() => {
          req.emit("data", "OK");
          req.emit("end");
        });
        req.statusCode = 200;
        return req;
      });

    await api.volumeDown(5);
    expect(spy).toHaveBeenCalledWith(`${apiUrl}?command=getPlayerStatus`, expect.anything(), expect.anything());
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("setPlayerCmd:vol:20")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Set Mute", async () => {
    const spy = spyOnGet("OK");
    await api.setMute(true);
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("setPlayerCmd:mute:1")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Get Meta Info", async () => {
    const metaInfo = {
      album: "Test Album",
      albumArtURI: "https://example.com/cover.jpg",
      artist: "Test Artist",
      bitDepth: 16,
      bitRate: 32,
      sampleRate: 44100,
      subtitle: "Test Subtitle",
      title: "Test Song",
      trackId: "12345",
    };
    const spy = spyOnGet(JSON.stringify({ metaData: metaInfo }));
    const result = await api.getMetaInfo();
    expect(spy).toHaveBeenCalledWith(`${apiUrl}?command=getMetaInfo`, expect.anything(), expect.anything());
    expect(result).toEqual(metaInfo);
  });

  test("Select Preset", async () => {
    const spy = spyOnGet("OK");
    await api.selectPreset(0);
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("MCUKeyShortClick:1")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Switch Input", async () => {
    const spy = spyOnGet("OK");
    await api.switchInput("optical");
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("setPlayerCmd:switchmode:optical")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Get EQ Presets", async () => {
    const presets = ["Rock", "Pop", "Jazz"];
    const spy = spyOnGet(JSON.stringify(presets));
    const result = await api.getEQPresets();
    expect(spy).toHaveBeenCalledWith(`${apiUrl}?command=EQGetList`, expect.anything(), expect.anything());
    expect(result).toEqual(presets);
  });

  test("Set EQ Preset", async () => {
    const spy = spyOnGet(JSON.stringify({ status: "OK" }));
    await api.setEQPreset("Rock");
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("EQLoad:Rock")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Set EQ Enabled", async () => {
    const spy = spyOnGet(JSON.stringify({ status: "OK" }));
    await api.setEQEnabled(true);
    expect(spy).toHaveBeenCalledWith(
      `${apiUrl}?command=${encodeURIComponent("EQOn")}`,
      expect.anything(),
      expect.anything(),
    );
  });

  test("Get System Info", async () => {
    const systemInfo = {
      ssid: "WiiM Mini",
      firmware: "1.0.0",
      MAC: "00:11:22:33:44:55",
      internet: "1",
      uuid: "550e8400-e29b-41d4-a716-446655440000",
      GroupName: "Living Room",
      DeviceName: "WiiM Mini",
    };
    const spy = spyOnGet(JSON.stringify(systemInfo));
    const result = await api.getSystemInfo();
    expect(spy).toHaveBeenCalledWith(`${apiUrl}?command=getStatusEx`, expect.anything(), expect.anything());
    expect(result).toEqual({
      ssid: "WiiM Mini",
      firmware: "1.0.0",
      macAddress: "00:11:22:33:44:55",
      internet: true,
      uuid: "550e8400-e29b-41d4-a716-446655440000",
      groupName: "Living Room",
      deviceName: "WiiM Mini",
    });
  });

  test("Get Player Status", async () => {
    const playerStatus = {
      type: "0",
      ch: "0",
      mode: "31",
      loop: "0",
      eq: 0,
      status: "play",
      curpos: 0,
      offset_pts: 0,
      totlen: 0,
      alarm: false,
      plicount: 0,
      plicurr: 0,
      mute: false,
      vol: 50,
    };
    const spy = spyOnGet(JSON.stringify(playerStatus));
    const result = await api.getPlayerStatus();
    expect(spy).toHaveBeenCalledWith(`${apiUrl}?command=getPlayerStatus`, expect.anything(), expect.anything());
    expect(result).toEqual({
      type: DeviceType.MASTER,
      ch: DeviceChannel.STEREO,
      mode: DeviceMode.SPOTIFY_CONNECT,
      loop: LoopMode.ALL,
      eq: 0,
      status: "play",
      currentPosition: 0,
      offsetPosition: 0,
      totalLength: 0,
      alarm: false,
      playlistLength: 0,
      playlistIndex: 0,
      mute: false,
      vol: 50,
    });
  });
});
