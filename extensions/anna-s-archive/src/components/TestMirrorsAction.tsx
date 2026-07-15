import { Action, Icon } from "@raycast/api";
import { TestMirrors } from "@/screens/TestMirrors";

export const TestMirrorsAction = () => <Action.Push title="Test Mirrors" target={<TestMirrors />} icon={Icon.List} />;
