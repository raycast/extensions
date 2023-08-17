import { Detail } from "@raycast/api";

const markdown = `
![Image Title](command-icon.png)

## Something went wrong.
Please make sure you have **MiniSim installed** and running latest version.\n\n
You can download it here: [Download](https://github.com/okwasniewski/MiniSim/releases)
`;

const ErrorScreen = () => {
  return <Detail markdown={markdown} />;
};

export default ErrorScreen;
