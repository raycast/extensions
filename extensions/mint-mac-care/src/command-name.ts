import { environment } from "@raycast/api";
import { nameSurfaceCommand } from "./mint-cli";

// Every surface request names the command that sent it, so Mint's record of the
// request says which one (Mint 1.2, `surface_request`). Imported for its effect
// by the hook every command uses and by the AI tool that asks Mint; never by the
// tests, which run outside Raycast.
nameSurfaceCommand(environment.entryPointName);
