import { splitCIDR } from "../src/utils/cidr-utils";

describe("cidr split", function () {
  it("10.0.0.0/24", function () {
    const res = splitCIDR([[10, 0, 0, 0], 24]);
    expect(res.range).toBe("10.0.0.0/24");
    expect(res.netmask).toBe("255.255.255.0");
    expect(res.wildcardBits).toBe("0.0.0.255");
    expect(res.totalHost).toBe(256);
    expect(res.firstIp).toBe("10.0.0.0");
    expect(res.firstIpInt).toBe(167772160);
    expect(res.lastIp).toBe("10.0.0.255");
    expect(res.lastIpInt).toBe(167772415);
  });
  it("192.168.0.0/16", function () {
    const res = splitCIDR([[192, 168, 0, 0], 16]);
    expect(res.range).toBe("192.168.0.0/16");
    expect(res.netmask).toBe("255.255.0.0");
    expect(res.wildcardBits).toBe("0.0.255.255");
    expect(res.totalHost).toBe(65536);
    expect(res.firstIp).toBe("192.168.0.0");
    expect(res.firstIpInt).toBe(3232235520);
    expect(res.lastIp).toBe("192.168.255.255");
    expect(res.lastIpInt).toBe(3232301055);
  });
  it("172.16.0.0/12", function () {
    const res = splitCIDR([[172, 16, 0, 0], 12]);
    expect(res.range).toBe("172.16.0.0/12");
    expect(res.netmask).toBe("255.240.0.0");
    expect(res.wildcardBits).toBe("0.15.255.255");
    expect(res.totalHost).toBe(1048576);
    expect(res.firstIp).toBe("172.16.0.0");
    expect(res.firstIpInt).toBe(2886729728);
    expect(res.lastIp).toBe("172.31.255.255");
    expect(res.lastIpInt).toBe(2887778303);
  });
  it("10.10.0.0/16", function () {
    const res = splitCIDR([[10, 10, 0, 0], 16]);
    expect(res.range).toBe("10.10.0.0/16");
    expect(res.netmask).toBe("255.255.0.0");
    expect(res.wildcardBits).toBe("0.0.255.255");
    expect(res.totalHost).toBe(65536);
    expect(res.firstIp).toBe("10.10.0.0");
    expect(res.firstIpInt).toBe(168427520);
    expect(res.lastIp).toBe("10.10.255.255");
    expect(res.lastIpInt).toBe(168493055);
  });
  it("192.0.2.0/24", function () {
    const res = splitCIDR([[192, 0, 2, 0], 24]);
    expect(res.range).toBe("192.0.2.0/24");
    expect(res.netmask).toBe("255.255.255.0");
    expect(res.wildcardBits).toBe("0.0.0.255");
    expect(res.totalHost).toBe(256);
    expect(res.firstIp).toBe("192.0.2.0");
    expect(res.firstIpInt).toBe(3221225984);
    expect(res.lastIp).toBe("192.0.2.255");
    expect(res.lastIpInt).toBe(3221226239);
  });
  it("203.0.113.0/24", function () {
    const res = splitCIDR([[203, 0, 113, 0], 24]);
    expect(res.range).toBe("203.0.113.0/24");
    expect(res.netmask).toBe("255.255.255.0");
    expect(res.wildcardBits).toBe("0.0.0.255");
    expect(res.totalHost).toBe(256);
    expect(res.firstIp).toBe("203.0.113.0");
    expect(res.firstIpInt).toBe(3405803776);
    expect(res.lastIp).toBe("203.0.113.255");
    expect(res.lastIpInt).toBe(3405804031);
  });
  it("198.51.100.0/24", function () {
    const res = splitCIDR([[198, 51, 100, 0], 24]);
    expect(res.range).toBe("198.51.100.0/24");
    expect(res.netmask).toBe("255.255.255.0");
    expect(res.wildcardBits).toBe("0.0.0.255");
    expect(res.totalHost).toBe(256);
    expect(res.firstIp).toBe("198.51.100.0");
    expect(res.firstIpInt).toBe(3325256704);
    expect(res.lastIp).toBe("198.51.100.255");
    expect(res.lastIpInt).toBe(3325256959);
  });
  it("172.18.0.0/16", function () {
    const res = splitCIDR([[172, 18, 0, 0], 16]);
    expect(res.range).toBe("172.18.0.0/16");
    expect(res.netmask).toBe("255.255.0.0");
    expect(res.wildcardBits).toBe("0.0.255.255");
    expect(res.totalHost).toBe(65536);
    expect(res.firstIp).toBe("172.18.0.0");
    expect(res.firstIpInt).toBe(2886860800);
    expect(res.lastIp).toBe("172.18.255.255");
    expect(res.lastIpInt).toBe(2886926335);
  });
  it("10.20.30.0/24", function () {
    const res = splitCIDR([[10, 20, 30, 0], 24]);
    expect(res.range).toBe("10.20.30.0/24");
    expect(res.netmask).toBe("255.255.255.0");
    expect(res.wildcardBits).toBe("0.0.0.255");
    expect(res.totalHost).toBe(256);
    expect(res.firstIp).toBe("10.20.30.0");
    expect(res.firstIpInt).toBe(169090560);
    expect(res.lastIp).toBe("10.20.30.255");
    expect(res.lastIpInt).toBe(169090815);
  });
  it("192.168.1.0/24", function () {
    const res = splitCIDR([[192, 168, 1, 0], 24]);
    expect(res.range).toBe("192.168.1.0/24");
    expect(res.netmask).toBe("255.255.255.0");
    expect(res.wildcardBits).toBe("0.0.0.255");
    expect(res.totalHost).toBe(256);
    expect(res.firstIp).toBe("192.168.1.0");
    expect(res.firstIpInt).toBe(3232235776);
    expect(res.lastIp).toBe("192.168.1.255");
    expect(res.lastIpInt).toBe(3232236031);
  });
  it("172.31.0.0/16", function () {
    const res = splitCIDR([[172, 31, 0, 0], 16]);
    expect(res.range).toBe("172.31.0.0/16");
    expect(res.netmask).toBe("255.255.0.0");
    expect(res.wildcardBits).toBe("0.0.255.255");
    expect(res.totalHost).toBe(65536);
    expect(res.firstIp).toBe("172.31.0.0");
    expect(res.firstIpInt).toBe(2887712768);
    expect(res.lastIp).toBe("172.31.255.255");
    expect(res.lastIpInt).toBe(2887778303);
  });
  it("10.100.0.0/16", function () {
    const res = splitCIDR([[10, 100, 0, 0], 16]);
    expect(res.range).toBe("10.100.0.0/16");
    expect(res.netmask).toBe("255.255.0.0");
    expect(res.wildcardBits).toBe("0.0.255.255");
    expect(res.totalHost).toBe(65536);
    expect(res.firstIp).toBe("10.100.0.0");
    expect(res.firstIpInt).toBe(174325760);
    expect(res.lastIp).toBe("10.100.255.255");
    expect(res.lastIpInt).toBe(174391295);
  });
  it("203.0.123.0/24", function () {
    const res = splitCIDR([[203, 0, 123, 0], 24]);
    expect(res.range).toBe("203.0.123.0/24");
    expect(res.netmask).toBe("255.255.255.0");
    expect(res.wildcardBits).toBe("0.0.0.255");
    expect(res.totalHost).toBe(256);
    expect(res.firstIp).toBe("203.0.123.0");
    expect(res.firstIpInt).toBe(3405806336);
    expect(res.lastIp).toBe("203.0.123.255");
    expect(res.lastIpInt).toBe(3405806591);
  });
  it("198.18.0.0/15", function () {
    const res = splitCIDR([[198, 18, 0, 0], 15]);
    expect(res.range).toBe("198.18.0.0/15");
    expect(res.netmask).toBe("255.254.0.0");
    expect(res.wildcardBits).toBe("0.1.255.255");
    expect(res.totalHost).toBe(131072);
    expect(res.firstIp).toBe("198.18.0.0");
    expect(res.firstIpInt).toBe(3323068416);
    expect(res.lastIp).toBe("198.19.255.255");
    expect(res.lastIpInt).toBe(3323199487);
  });
  it("172.19.0.0/16", function () {
    const res = splitCIDR([[172, 19, 0, 0], 16]);
    expect(res.range).toBe("172.19.0.0/16");
    expect(res.netmask).toBe("255.255.0.0");
    expect(res.wildcardBits).toBe("0.0.255.255");
    expect(res.totalHost).toBe(65536);
    expect(res.firstIp).toBe("172.19.0.0");
    expect(res.firstIpInt).toBe(2886926336);
    expect(res.lastIp).toBe("172.19.255.255");
    expect(res.lastIpInt).toBe(2886991871);
  });
  it("10.50.0.0/16", function () {
    const res = splitCIDR([[10, 50, 0, 0], 16]);
    expect(res.range).toBe("10.50.0.0/16");
    expect(res.netmask).toBe("255.255.0.0");
    expect(res.wildcardBits).toBe("0.0.255.255");
    expect(res.totalHost).toBe(65536);
    expect(res.firstIp).toBe("10.50.0.0");
    expect(res.firstIpInt).toBe(171048960);
    expect(res.lastIp).toBe("10.50.255.255");
    expect(res.lastIpInt).toBe(171114495);
  });
  it("192.168.2.0/24", function () {
    const res = splitCIDR([[192, 168, 2, 0], 24]);
    expect(res.range).toBe("192.168.2.0/24");
    expect(res.netmask).toBe("255.255.255.0");
    expect(res.wildcardBits).toBe("0.0.0.255");
    expect(res.totalHost).toBe(256);
    expect(res.firstIp).toBe("192.168.2.0");
    expect(res.firstIpInt).toBe(3232236032);
    expect(res.lastIp).toBe("192.168.2.255");
    expect(res.lastIpInt).toBe(3232236287);
  });
  it("172.17.0.0/16", function () {
    const res = splitCIDR([[172, 17, 0, 0], 16]);
    expect(res.range).toBe("172.17.0.0/16");
    expect(res.netmask).toBe("255.255.0.0");
    expect(res.wildcardBits).toBe("0.0.255.255");
    expect(res.totalHost).toBe(65536);
    expect(res.firstIp).toBe("172.17.0.0");
    expect(res.firstIpInt).toBe(2886795264);
    expect(res.lastIp).toBe("172.17.255.255");
    expect(res.lastIpInt).toBe(2886860799);
  });
  it("10.200.0.0/16", function () {
    const res = splitCIDR([[10, 200, 0, 0], 16]);
    expect(res.range).toBe("10.200.0.0/16");
    expect(res.netmask).toBe("255.255.0.0");
    expect(res.wildcardBits).toBe("0.0.255.255");
    expect(res.totalHost).toBe(65536);
    expect(res.firstIp).toBe("10.200.0.0");
    expect(res.firstIpInt).toBe(180879360);
    expect(res.lastIp).toBe("10.200.255.255");
    expect(res.lastIpInt).toBe(180944895);
  });
  it("192.168.3.0/24", function () {
    const res = splitCIDR([[192, 168, 3, 0], 24]);
    expect(res.range).toBe("192.168.3.0/24");
    expect(res.netmask).toBe("255.255.255.0");
    expect(res.wildcardBits).toBe("0.0.0.255");
    expect(res.totalHost).toBe(256);
    expect(res.firstIp).toBe("192.168.3.0");
    expect(res.firstIpInt).toBe(3232236288);
    expect(res.lastIp).toBe("192.168.3.255");
    expect(res.lastIpInt).toBe(3232236543);
  });
});
