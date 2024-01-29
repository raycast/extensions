import { Detail } from "@raycast/api";

const Statement = `
# Notice for User

Dear User,

Currently, **Naming** supports only **Raycast AI** users. If you don’t have access, we're diligently working to support **OpenAI** users soon. 

We appreciate your patience. 

**Thank you.**

`;

const PermissionStatement = () => {
  return <Detail markdown={Statement} />;
};

export default PermissionStatement;
