import { parseRelayList, parseRelayListLine } from "./utils";

it.each([
  { value: "New Zealand (nz)", name: "New Zealand", id: "nz" },
  { value: "	Auckland (akl) @ -36.84846°N, 174.76334°W", name: "Auckland", id: "akl" },
  { value: "USA (us)", name: "USA", id: "us" },
  { value: "	Los Angeles, CA (lax) @ 34.05224°N, -118.24368°W", name: "Los Angeles, CA", id: "lax" },
  { value: "	Phoenix, AZ (phx) @ 33.44838°N, -112.07404°W", name: "Phoenix, AZ", id: "phx" },
  { value: "United Arab Emirates (ae)", name: "United Arab Emirates", id: "ae" },
  { value: "UK (gb)", name: "UK", id: "gb" },
  { value: "  London (lon) @ 51.51412°N, -0.09369°W", name: "London", id: "lon" },
])("should extract the name: $name and id: $id correctly", ({ value, name, id }) => {
  expect(parseRelayListLine(value)).toEqual({ name, id });
});

it("should throw an error with a irregular format", () => {
  expect(() => parseRelayListLine("This is not the right format")).toThrowError("Invalid command format.");
});

it("should throw an error with relay format", () => {
  expect(() => parseRelayListLine("		us-qas-001 (198.54.135.162) - OpenVPN, hosted by Tzulo (rented)")).toThrowError(
    "Invalid command format."
  );
});

it("parse mullvad relay list output correctly", () => {
  const relayItems = parseRelayList(`
New Zealand (nz)
	Auckland (akl) @ -36.84846°N, 174.76334°W
		nz-akl-001 (103.231.91.114) - OpenVPN, hosted by Intergrid (rented)
		nz1-wireguard (103.108.94.34, 2400:fa80:4:10::a01f) - WireGuard, hosted by Intergrid (rented)
		nz2-wireguard (103.231.91.226, 2400:fa80:4:11::a02f) - WireGuard, hosted by Intergrid (rented)


UK (gb)
	London (lon) @ 51.51412°N, -0.09369°W
		gb-lon-001 (141.98.252.131) - OpenVPN, hosted by 31173 (Mullvad-owned)
		gb-lon-002 (141.98.252.132) - OpenVPN, hosted by 31173 (Mullvad-owned)
		gb-lon-003 (141.98.252.133) - OpenVPN, hosted by 31173 (Mullvad-owned)
		gb-lon-005 (185.195.232.85) - OpenVPN, hosted by 31173 (Mullvad-owned)
		gb-lon-006 (185.195.232.86) - OpenVPN, hosted by 31173 (Mullvad-owned)
		gb-lon-008 (141.98.252.138) - OpenVPN, hosted by 31173 (Mullvad-owned)
		gb-lon-009 (141.98.252.139) - OpenVPN, hosted by 31173 (Mullvad-owned)
		gb-lon-ovpn-301 (146.70.119.98) - OpenVPN, hosted by M247 (rented)
		gb-lon-ovpn-302 (146.70.119.130) - OpenVPN, hosted by M247 (rented)
		gb-lon-ovpn-303 (146.70.119.162) - OpenVPN, hosted by M247 (rented)
		gb-lon-wg-101 (146.70.119.66, 2001:ac8:31:f007::a39f) - WireGuard, hosted by M247 (rented)
		gb-lon-wg-104 (141.98.100.146, 2001:ac8:31:237::a16f) - WireGuard, hosted by M247 (rented)
		gb-lon-wg-302 (146.70.119.2, 2001:ac8:31:f005::a37f) - WireGuard, hosted by M247 (rented)
		gb4-wireguard (141.98.252.130, 2a03:1b20:7:f011::a01f) - WireGuard, hosted by 31173 (Mullvad-owned)
		gb5-wireguard (141.98.252.222, 2a03:1b20:7:f011::a02f) - WireGuard, hosted by 31173 (Mullvad-owned)
		gb11-wireguard (185.195.232.66, 2a03:1b20:7:f011::a11f) - WireGuard, hosted by 31173 (Mullvad-owned)
		gb12-wireguard (185.195.232.67, 2a03:1b20:7:f011::a12f) - WireGuard, hosted by 31173 (Mullvad-owned)
		gb13-wireguard (185.195.232.68, 2a03:1b20:7:f011::a13f) - WireGuard, hosted by 31173 (Mullvad-owned)
		gb14-wireguard (185.195.232.69, 2a03:1b20:7:f011::a14f) - WireGuard, hosted by 31173 (Mullvad-owned)
		gb15-wireguard (185.195.232.70, 2a03:1b20:7:f011::a15f) - WireGuard, hosted by 31173 (Mullvad-owned)
		gb33-wireguard (185.248.85.3, 2a0b:89c1:3::a33f) - WireGuard, hosted by xtom (rented)
		gb34-wireguard (185.248.85.18, 2a0b:89c1:3::a34f) - WireGuard, hosted by xtom (rented)
		gb35-wireguard (185.248.85.33, 2a0b:89c1:3::a35f) - WireGuard, hosted by xtom (rented)
		gb36-wireguard (185.248.85.48, 2a0b:89c1:3::a36f) - WireGuard, hosted by xtom (rented)
		gb38-wireguard (146.70.119.34, 2001:ac8:31:f006::a38f) - WireGuard, hosted by M247 (rented)
	Manchester (mnc) @ 53.50000°N, -2.21667°W
		gb-mnc-101 (217.151.98.68) - OpenVPN, hosted by M247 (rented)
		gb-mnc-102 (37.120.159.164) - OpenVPN, hosted by M247 (rented)
		gb-mnc-103 (194.37.96.180) - OpenVPN, hosted by M247 (rented)
		gb-mnc-106 (89.238.132.36) - OpenVPN, hosted by M247 (rented)
		gb-mnc-ovpn-001 (146.70.132.2) - OpenVPN, hosted by M247 (rented)
		gb-mnc-ovpn-002 (146.70.132.34) - OpenVPN, hosted by M247 (rented)
		gb-mnc-ovpn-003 (146.70.132.66) - OpenVPN, hosted by M247 (rented)
		gb-mnc-ovpn-004 (146.70.132.98) - OpenVPN, hosted by M247 (rented)
		gb-mnc-wg-001 (146.70.133.98, 2001:ac8:8b:2d::a47f) - WireGuard, hosted by M247 (rented)
		gb-mnc-wg-002 (146.70.132.130, 2001:ac8:8b:26::a40f) - WireGuard, hosted by M247 (rented)
		gb-mnc-wg-003 (146.70.132.162, 2001:ac8:8b:27::a41f) - WireGuard, hosted by M247 (rented)
		gb-mnc-wg-004 (146.70.132.194, 2001:ac8:8b:28::a42f) - WireGuard, hosted by M247 (rented)
		gb-mnc-wg-005 (146.70.132.226, 2001:ac8:8b:29::a43f) - WireGuard, hosted by M247 (rented)
		gb-mnc-wg-006 (146.70.133.2, 2001:ac8:8b:2a::a44f) - WireGuard, hosted by M247 (rented)
		gb-mnc-wg-007 (146.70.133.34, 2001:ac8:8b:2b::a45f) - WireGuard, hosted by M247 (rented)
		gb22-wireguard (185.206.227.130, 2001:ac8:21:ac::a22f) - WireGuard, hosted by M247 (rented)
		gb24-wireguard (194.37.96.98, 2001:ac8:21:ae::a24f) - WireGuard, hosted by M247 (rented)
		gb25-wireguard (81.92.205.18, 2001:ac8:21:af::a25f) - WireGuard, hosted by M247 (rented)
		gb26-wireguard (86.106.136.210, 2001:ac8:21:b5::a26f) - WireGuard, hosted by M247 (rented)
		gb27-wireguard (89.238.130.66, 2001:ac8:21:b6::a27f) - WireGuard, hosted by M247 (rented)
		gb28-wireguard (194.37.96.114, 2001:ac8:21:b7::a28f) - WireGuard, hosted by M247 (rented)
		gb29-wireguard (81.92.206.2, 2001:ac8:21:b8::a29f) - WireGuard, hosted by M247 (rented)
		gb30-wireguard (194.37.96.130, 2001:ac8:21:b9::a30f) - WireGuard, hosted by M247 (rented)
		gb31-wireguard (89.238.143.226, 2001:ac8:21:ba::a31f) - WireGuard, hosted by M247 (rented)
		gb32-wireguard (194.37.96.146, 2001:ac8:21:bb::a32f) - WireGuard, hosted by M247 (rented)
		gb46-wireguard (146.70.133.66, 2001:ac8:8b:2c::a46f) - WireGuard, hosted by M247 (rented)
`);

  // some duplication here 🤷
  expect(relayItems).toHaveLength(2);
  expect(relayItems[0].name).toBe("New Zealand");
  expect(relayItems[0].id).toBe("nz");
  expect(relayItems[0].children).toHaveLength(1);
  expect(relayItems[0]?.children?.[0].name).toBe("Auckland");
  expect(relayItems[0]?.children?.[0].id).toBe("akl");
  expect(relayItems[1].children).toHaveLength(2);

  expect(relayItems).toMatchSnapshot();
});
