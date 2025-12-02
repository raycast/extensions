import z from "zod";

export const IpAddress = z.object({
  ip: z.string(),
});

export interface AddressResponse {
  v4?: string;
  v6?: string;
}

export class AddressType {
  public static IPV4 = new AddressType(1);
  public static IPV6 = new AddressType(2);
  public static BOTH = new AddressType(3);

  constructor(private addrType: number) {}

  get isIPv4() {
    return (this.addrType & 1) == 1;
  }

  get isIPv6() {
    return (this.addrType & 2) == 2;
  }

  async getAddress(): Promise<AddressResponse> {
    const response: AddressResponse = {};

    if (this.isIPv4) {
      const resp = await fetch("https://api.ipify.org?format=json");
      const ipResponse = await resp.json().then((v) => z.parseAsync(IpAddress, v));
      response.v4 = ipResponse.ip;
    }

    if (this.isIPv6) {
      const resp = await fetch("https://api64.ipify.org?format=json");
      const ipResponse = await resp.json().then((v) => z.parseAsync(IpAddress, v));
      if ((response.v4 && ipResponse.ip != response.v4) || !response.v4) {
        response.v6 = ipResponse.ip;
      }
    }

    return response;
  }
}
