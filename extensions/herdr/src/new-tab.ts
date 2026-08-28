import { quickHerdrAction } from "./lib/quick-actions";
export default () => quickHerdrAction(["tab", "create", "--focus"], "Creating tab", "Tab Created");
