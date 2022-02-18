import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Profile } from "@chyroc/v2ex-api";
import { v2exCli } from "@/api";

export default () => {
  const [profile, setProfile] = useState<Profile>();
  useEffect(() => {
    const f = async () => {
      try {
        const res = await v2exCli.getProfile();
        setProfile(res.profile);
        console.log(res);
      } catch (e) {
        console.error(e);
        await showToast(Toast.Style.Failure, "request fail", `${e}`);
      }
    };
    f();
  }, []);

  return <Detail isLoading={!profile} markdown={profile ? generateProfileMarkdown(profile) : "Loading"} />;
};

const generateProfileMarkdown = (profile: Profile) => {
  const data = [];
  data.push(`# Profile`);
  data.push("");

  data.push(`![avatar](${profile.avatar_normal})`);

  data.push(`- username: [${profile.username}](${profile.website})`);
  data.push("");

  const fields = ["id", "website", "twitter", "github", "btc", "location", "tagline", "bio"];
  for (const field of fields) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (profile[field]) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      data.push(`- ${field}: ${profile[field]}`);
      data.push("");
    }
  }

  return data.join("\n");
};
