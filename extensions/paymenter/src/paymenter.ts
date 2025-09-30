import { Invoice, Result, Ticket, TicketMessage, User } from "./types";

export class Paymenter {
  private url: string;
  private token: string;
  public invoices: InvoicesService;
  public tickets: TicketsService;
  public ticketMessages: TicketMessagesService;
  public users: UsersService;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
    this.invoices = new InvoicesService(this);
    this.tickets = new TicketsService(this);
    this.ticketMessages = new TicketMessagesService(this);
    this.users = new UsersService(this);
  }

  public async request<T>(endpoint: string, options?: RequestInit) {
    const response = await fetch(new URL(`api/v1/admin/${endpoint}`, this.url).toString(), {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!response.ok) {
      if (!response.headers.get("content-type")?.includes("json")) throw new Error(response.statusText);
      const result = (await response.json()) as Error;
      throw new Error(result.message);
    }
    const result = (await response.json()) as Result<T>;
    return result;
  }
}

class InvoicesService {
  constructor(private client: Paymenter) {}
  async list() {
    return this.client.request<Invoice[]>("invoices");
  }
}
class TicketsService {
  constructor(private client: Paymenter) {}
  async list() {
    return this.client.request<Ticket[]>("tickets");
  }
}
class TicketMessagesService {
  constructor(private client: Paymenter) {}
  async list(ticketId: string) {
    return this.client.request<TicketMessage[]>(`ticket-messages?filter[id]=${ticketId}`);
  }
}
class UsersService {
  constructor(private client: Paymenter) {}
  async create(user: Partial<User["attributes"]>) {
    return this.client.request<User>("users", {
      method: "POST",
      body: JSON.stringify(user),
    });
  }
  async list() {
    return this.client.request<User[]>("users");
  }
}

export default Paymenter;
