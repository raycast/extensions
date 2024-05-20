import { EmailAccount } from "./types";
import useUAPI from "./useUAPI";

export const uapi = {
    email: {
        list: () => useUAPI<EmailAccount[]>("Email", "list_pops", { skip_main: 1 })
    }
}