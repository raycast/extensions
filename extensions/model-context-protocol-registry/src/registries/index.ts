import { Icon } from "@raycast/api";
import { CommunityRegistry, OfficialRegistry } from "./builtin";
import { SmitheryRegistry } from "./smithery";
import { Registry } from "./types";

export const REGISTRIES: Registry[] = [
  {
    id: "official",
    title: "Official",
    icon: Icon.CheckRosette,
    component: OfficialRegistry,
  },
  {
    id: "community",
    title: "Community",
    icon: Icon.Person,
    component: CommunityRegistry,
  },
  {
    id: "smithery",
    title: "Smithery",
    icon: "smithery.svg",
    component: SmitheryRegistry,
    throttle: true,
  },
];
