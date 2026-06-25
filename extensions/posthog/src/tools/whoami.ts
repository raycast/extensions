import { posthogRequest, truncateValue } from "../posthog-client";
import { requireAccountId } from "../tool-auth";

type Input = {
  accountId?: string;
};

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

export default async function tool({ accountId }: Input = {}) {
  const resolvedAccountId = requireAccountId(accountId);
  const user = await posthogRequest<PostHogUser>(resolvedAccountId, "users/@me/");

  return truncateValue({
    accountId: resolvedAccountId,
    id: user.id,
    uuid: user.uuid,
    distinctId: user.distinct_id,
    name: user.first_name,
    email: user.email,
    organization: user.organization,
  });
}
