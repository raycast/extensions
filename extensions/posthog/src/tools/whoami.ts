import { posthogRequest, truncateValue } from "../posthog-client";

type PostHogUser = {
  id?: number;
  uuid?: string;
  distinct_id?: string;
  first_name?: string;
  email?: string;
  organization?: {
    id?: string;
    name?: string;
    slug?: string;
  };
};

export default async function tool() {
  const user = await posthogRequest<PostHogUser>("users/@me/");

  return truncateValue({
    id: user.id,
    uuid: user.uuid,
    distinctId: user.distinct_id,
    name: user.first_name,
    email: user.email,
    organization: user.organization,
  });
}
