import { usePromise } from "@raycast/utils";
import { getDomainUserAccountInfo } from "./lib/ldap";
import { LDAPSingleUserList } from "./components/user";

function getCurrentDomainUser() {
  // process.env.USERNAME; // seems not to work in raycast
  const home = process.env.HOME;
  if (!home) {
    return null;
  }
  const parts = home.split("\\");
  return parts[parts.length - 1];
}

export default function Command() {
  const { data, isLoading } = usePromise(async () => {
    const username = getCurrentDomainUser();
    if (!username) {
      throw new Error("Could not determine current user");
    }
    const user = await getDomainUserAccountInfo({ username });
    return user;
  }, []);

  return <LDAPSingleUserList user={data} isLoading={isLoading} />;
}
