import { ErrorApiGetToken } from "./errors";
import {
  VMSummary,
  VMInfo,
  VmStoragePolicyInfo,
  NetworkSummary,
  DatastoreSummary,
  VMGuestPowerAction,
  VMPowerAction,
  StoragePoliciesSummary,
  VMStoragePolicyComplianceInfo,
  VmGuestNetworkingInterfacesInfo,
  HostSummary,
  VmConsoleTicketsType,
  VmConsoleTicketsCreateSpec,
  VmConsoleTicketsSummary,
} from "./types";
import fetch from "cross-fetch";

export class vCenter {
  private readonly _credential: string;
  private _token: string | undefined;
  private readonly _fqdn: string;
  private readonly _timeout: number = 3000;

  constructor(fqdn: string, username: string, password: string) {
    this._fqdn = fqdn;
    this._credential = Buffer.from(`${username}:${password}`).toString("base64");
  }

  GetFqdn(): string {
    return this._fqdn;
  }

  private async getToken(): Promise<void> {
    const url = `https://${this._fqdn}/api/session`;

    const token = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this._credential}`,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }

        switch (response.status) {
          case 401:
            throw new ErrorApiGetToken(401, "Unauthorized", "Please check your credentials");
          case 503:
            throw new ErrorApiGetToken(503, "Service unavailable", "Please check your vCenter status");
          default:
            throw new ErrorApiGetToken(response.status, "Unknown error", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    if (token) this._token = token as string;
  }

  async ListVM(searchParamString?: string): Promise<VMSummary[] | undefined> {
    const url = new URL(`/api/vcenter/vm${searchParamString ? `/?${searchParamString}` : ""}`, `https://${this._fqdn}`);

    while (!this._token) {
      await this.getToken();
    }

    const vms: VMSummary[] | undefined = await fetch(url, {
      method: "GET",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<VMSummary[]>;
        }

        switch (response.status) {
          case 400:
            throw new ErrorApiGetToken(
              400,
              "VM.FilterSpec.power-states field contains a value that is not supported by the server",
              ""
            );
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have permission to perform the operation", "");
          case 404:
            throw new ErrorApiGetToken(404, "more than 4000 virtual machines match the VM.FilterSpec", "");
          case 503:
            throw new ErrorApiGetToken(503, "the server is not available", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return vms;
  }

  async GetVM(vm: string): Promise<VMInfo | undefined> {
    const url = `https://${this._fqdn}/api/vcenter/vm/${vm}`;

    while (!this._token) {
      await this.getToken();
    }

    const vmInfo: VMInfo | undefined = await fetch(url, {
      method: "GET",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<VMInfo>;
        }

        switch (response.status) {
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have permission to perform the operation", "");
          case 404:
            throw new ErrorApiGetToken(404, "virtual machine is not found", "");
          case 500:
            throw new ErrorApiGetToken(500, "system reports an error while responding to the request", "");
          case 503:
            throw new ErrorApiGetToken(503, "the server is not available", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return vmInfo;
  }

  async GetVMStoragePolicy(vm: string): Promise<VmStoragePolicyInfo | undefined> {
    const url = `https://${this._fqdn}/api/vcenter/vm/${vm}/storage/policy`;

    while (!this._token) {
      await this.getToken();
    }

    const policy: VmStoragePolicyInfo | undefined = await fetch(url, {
      method: "GET",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<VmStoragePolicyInfo>;
        }

        switch (response.status) {
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have permission to perform the operation", "");
          case 500:
            throw new ErrorApiGetToken(500, "system reports an error while responding to the request", "");
          case 503:
            throw new ErrorApiGetToken(503, "the server is not available", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return policy;
  }

  async GetNetworks(): Promise<NetworkSummary[] | undefined> {
    const url = `https://${this._fqdn}/api/vcenter/network`;

    while (!this._token) {
      await this.getToken();
    }

    const networks: NetworkSummary[] | undefined = await fetch(url, {
      method: "GET",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<NetworkSummary[]>;
        }

        switch (response.status) {
          case 400:
            throw new ErrorApiGetToken(
              400,
              "Network.FilterSpec.types field contains a value that is not supported by the server",
              ""
            );
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have the required privileges", "");
          case 500:
            throw new ErrorApiGetToken(500, "more than 1000 networks match the Network.FilterSpec", "");
          case 503:
            throw new ErrorApiGetToken(
              503,
              "the system is unable to communicate with a service to complete the request",
              ""
            );
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return networks;
  }

  async GetStoragePolicy(): Promise<StoragePoliciesSummary[] | undefined> {
    const url = `https://${this._fqdn}/api/vcenter/storage/policies`;

    while (!this._token) {
      await this.getToken();
    }

    const policies: StoragePoliciesSummary[] | undefined = await fetch(url, {
      method: "GET",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<StoragePoliciesSummary[]>;
        }

        switch (response.status) {
          case 400:
            throw new ErrorApiGetToken(
              400,
              "Policies.FilterSpec contains a value that is not supported by the server",
              ""
            );
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have the required privileges", "");
          case 500:
            throw new ErrorApiGetToken(500, "more than 1000 networks match the Network.FilterSpec", "");
          case 503:
            throw new ErrorApiGetToken(
              503,
              "the system is unable to communicate with a service to complete the request",
              ""
            );
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return policies;
  }

  async GetVMStoragePolicyCompliance(vm: string): Promise<VMStoragePolicyComplianceInfo | undefined> {
    const url = `https://${this._fqdn}/api/vcenter/vm/${vm}/storage/policy/compliance`;

    while (!this._token) {
      await this.getToken();
    }

    const compliance: VMStoragePolicyComplianceInfo | undefined = await fetch(url, {
      method: "GET",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<VMStoragePolicyComplianceInfo>;
        }

        switch (response.status) {
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have the required privileges", "");
          case 500:
            throw new ErrorApiGetToken(500, "more than 1000 networks match the Network.FilterSpec", "");
          case 503:
            throw new ErrorApiGetToken(
              503,
              "the system is unable to communicate with a service to complete the request",
              ""
            );
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return compliance;
  }

  async GetVMGuestNetworkingInterfaces(vm: string): Promise<VmGuestNetworkingInterfacesInfo[] | undefined> {
    const url = `https://${this._fqdn}/api/vcenter/vm/${vm}/guest/networking/interfaces`;

    while (!this._token) {
      await this.getToken();
    }

    const interfaces: VmGuestNetworkingInterfacesInfo[] | undefined = await fetch(url, {
      method: "GET",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<VmGuestNetworkingInterfacesInfo[]>;
        }

        switch (response.status) {
          case 404:
            throw new ErrorApiGetToken(403, "virtual machine is not found", "");
          case 500:
            throw new ErrorApiGetToken(500, "system reports an error while responding to the request", "");
          case 503:
            throw new ErrorApiGetToken(503, "VMware Tools is not running", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return interfaces;
  }

  async VMGuestPower(vm: string, action: VMGuestPowerAction): Promise<void> {
    const url = `https://${this._fqdn}/api/vcenter/vm/${vm}/guest/power?action=${action}`;

    while (!this._token) {
      await this.getToken();
    }

    await fetch(url, {
      method: "POST",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        switch (response.status) {
          case 400:
            throw new ErrorApiGetToken(400, "the action is not supported by the server", "");
          case 404:
            throw new ErrorApiGetToken(404, "virtual machine is not found", "");
          case 500:
            throw new ErrorApiGetToken(500, "system reports an error while responding to the request", "");
          case 503:
            throw new ErrorApiGetToken(503, "VMware Tools is not running on the virtual machine", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });
  }

  async VMPower(vm: string, action: VMPowerAction): Promise<void> {
    const url = `https://${this._fqdn}/api/vcenter/vm/${vm}/power?action=${action}`;

    while (!this._token) {
      await this.getToken();
    }

    await fetch(url, {
      method: "POST",
      headers: {
        "vmware-api-session-id": this._token,
      },
    })
      .then((response) => {
        switch (response.status) {
          case 400:
            throw new ErrorApiGetToken(400, "the action is not supported by the server", "");
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have the required privileges", "");
          case 404:
            throw new ErrorApiGetToken(404, "virtual machine is not found", "");
          case 500:
            throw new ErrorApiGetToken(500, "system reports an error while responding to the request", "");
          case 503:
            throw new ErrorApiGetToken(503, "VMware Tools is not running on the virtual machine", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });
  }

  async ListHost(): Promise<HostSummary[] | undefined> {
    const url = `https://${this._fqdn}/api/vcenter/host`;

    while (!this._token) {
      await this.getToken();
    }

    const hosts: HostSummary[] | undefined = await fetch(url, {
      method: "GET",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<HostSummary[]>;
        }

        switch (response.status) {
          case 400:
            throw new ErrorApiGetToken(
              400,
              "Host.FilterSpec.connection-states field contains a value that is not supported by the server",
              ""
            );
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have permission to perform the operation", "");
          case 500:
            throw new ErrorApiGetToken(404, "more than 2500 hosts match the Host.FilterSpec", "");
          case 503:
            throw new ErrorApiGetToken(503, "the server is not available", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return hosts;
  }

  async ListNetwork(): Promise<NetworkSummary[] | undefined> {
    const url = `https://${this._fqdn}/api/vcenter/network`;

    while (!this._token) {
      await this.getToken();
    }

    const networks: NetworkSummary[] | undefined = await fetch(url, {
      method: "GET",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<NetworkSummary[]>;
        }

        switch (response.status) {
          case 400:
            throw new ErrorApiGetToken(
              400,
              "Network.FilterSpec.types field contains a value that is not supported by the server",
              ""
            );
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have permission to perform the operation", "");
          case 500:
            throw new ErrorApiGetToken(404, "more than 1000 networks match the Network.FilterSpec", "");
          case 503:
            throw new ErrorApiGetToken(503, "the server is not available", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return networks;
  }

  async ListDatastore(): Promise<DatastoreSummary[] | undefined> {
    const url = `https://${this._fqdn}/api/vcenter/datastore`;

    while (!this._token) {
      await this.getToken();
    }

    const datastores: DatastoreSummary[] | undefined = await fetch(url, {
      method: "GET",
      headers: {
        "vmware-api-session-id": this._token,
      },
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<DatastoreSummary[]>;
        }

        switch (response.status) {
          case 400:
            throw new ErrorApiGetToken(
              400,
              "Datastore.FilterSpec.types field contains a value that is not supported by the server",
              ""
            );
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have permission to perform the operation", "");
          case 500:
            throw new ErrorApiGetToken(404, "more than 1000 datastores match the Datastore.FilterSpec", "");
          case 503:
            throw new ErrorApiGetToken(503, "the server is not available", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return datastores;
  }

  async VMCreateConsoleTickets(
    vm: string,
    type: VmConsoleTicketsType = VmConsoleTicketsType.VMRC
  ): Promise<VmConsoleTicketsSummary | undefined> {
    const url = `https://${this._fqdn}/api/vcenter/vm/${vm}/console/tickets`;
    const body: VmConsoleTicketsCreateSpec = {
      type: type,
    };

    while (!this._token) {
      await this.getToken();
    }

    const ticket: VmConsoleTicketsSummary | undefined = await fetch(url, {
      method: "POST",
      headers: {
        "vmware-api-session-id": this._token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this._timeout),
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<VmConsoleTicketsSummary>;
        }

        switch (response.status) {
          case 400:
            throw new ErrorApiGetToken(400, "the action is not supported by the server", "");
          case 401:
            this._token = undefined;
            throw new ErrorApiGetToken(401, "the user can not be authenticated", "");
          case 403:
            throw new ErrorApiGetToken(403, "the user does not have the required privileges", "");
          case 404:
            throw new ErrorApiGetToken(404, "virtual machine is not found", "");
          case 500:
            throw new ErrorApiGetToken(500, "system reports an error while responding to the request", "");
          case 503:
            throw new ErrorApiGetToken(503, "VMware Tools is not running on the virtual machine", "");
        }
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof ErrorApiGetToken) throw error;
        if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE")
          throw new ErrorApiGetToken(500, "vCenter Certificate Error", "", error);
        throw new ErrorApiGetToken(500, "vCenter unreachable", "Please check your vCenter status", error);
      });

    return ticket;
  }
}
