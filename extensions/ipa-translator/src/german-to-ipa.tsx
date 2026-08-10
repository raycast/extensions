import { CustomForm } from "./form";
import { Languages } from "./types";

// Add this command to 'package.json' when memory fix is available.
const Command = () => <CustomForm language={Languages.German} />;

export default Command;
