import { useCachedPromise } from "@raycast/utils";
import { getDomainUserAccountInfo, getDomainUserPasswordExpireTimeInSeconds } from "./lib/ldap";
import { LDAPSingleUserList } from "./components/user";
import os from "os";

function getCurrentDomainUser() {
  const username = os.userInfo().username;
  return username;
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(async () => {
    const username = getCurrentDomainUser();
    if (!username) {
      throw new Error("Could not determine current user");
    }
    const user = await getDomainUserAccountInfo({ username });
    const domainExpirePasswordPolicy = await getDomainUserPasswordExpireTimeInSeconds();
    return {
      user,
      domainExpirePasswordPolicy,
    };
  }, []);

  return (
    <LDAPSingleUserList
      user={data?.user}
      isLoading={isLoading}
      domainExpirePasswordPolicy={data?.domainExpirePasswordPolicy}
    />
  );
}
