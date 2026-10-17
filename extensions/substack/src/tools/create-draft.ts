import { resolveAccount } from "@/lib/accounts";
import { DraftSaveError, createNewsletterDraft } from "@/lib/createDraft";
import { rememberDraft } from "@/lib/recovery";

type Input = {
  /** Connection ID returned by list-accounts. Omit only to use the default or sole account. */
  accountId?: string;
  /** Newsletter title. */
  title: string;
  /** Optional newsletter subtitle. */
  subtitle?: string;
  /** Body in supported Markdown. Code blocks, tables, HTML, task lists and local images are unsupported. */
  markdown: string;
};
export default async function tool(input: Input) {
  const account = await resolveAccount(input.accountId);
  try {
    const draft = await createNewsletterDraft(
      { ...account, title: input.title, subtitle: input.subtitle ?? "", markdown: input.markdown },
      (created) => rememberDraft(account.id, input.title, created, false),
    );
    try {
      await rememberDraft(account.id, input.title, draft, true);
    } catch {
      throw new DraftSaveError(draft);
    }
    return { ...draft, accountId: account.id, title: input.title.trim(), status: "unpublished" };
  } catch (error) {
    if (error instanceof DraftSaveError)
      return {
        ...error.draft,
        accountId: account.id,
        status: "needs-review",
        draftExists: true,
        message: error.message + " Do not retry creation.",
      };
    throw error;
  }
}
