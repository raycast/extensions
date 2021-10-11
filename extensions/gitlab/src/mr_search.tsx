import { render } from "@raycast/api";
import { MRList, MRScope } from "./components/mr";

render(<MRList scope={MRScope.created_by_me} />);
