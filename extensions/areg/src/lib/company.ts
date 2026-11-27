import { Color } from "@raycast/api";
import { useAreg } from "./api";
import { Brand } from "./brand";
import type { Strings } from "./strings";
import type { CompanyResponse, FinancialsResponse, RolesResponse } from "./types";

export type StatusTag = { label: string; color: Color.ColorLike };

export function companyStatus(company: CompanyResponse | undefined, t: Strings): StatusTag[] {
  const data = company?.data;
  if (!data) return [];
  const tags: StatusTag[] = [];
  if (data.slettedato) tags.push({ label: t.deleted, color: Color.SecondaryText });
  if (data.konkurs) tags.push({ label: t.bankrupt, color: Brand.down });
  if (data.underTvangsavviklingEllerTvangsopplosning) tags.push({ label: t.forcedDissolution, color: Brand.down });
  if (data.underAvvikling) tags.push({ label: t.dissolving, color: Brand.down });
  return tags.length ? tags : [{ label: t.active, color: Color.SecondaryText }];
}

export function keyPeople(roles: RolesResponse | undefined) {
  const all = roles?.groups.flatMap((group) => group.roles).filter((role) => !role.resigned) ?? [];
  const find = (...codes: string[]) => all.find((role) => codes.includes(role.code));
  const name = (role: ReturnType<typeof find>) => role?.person?.name ?? role?.entity?.name;
  return {
    ceo: name(find("DAGL")),
    chair: name(find("LEDE")),
    auditor: name(find("REVI")),
    accountant: name(find("REGN")),
    board: all.filter((role) => ["LEDE", "NEST", "MEDL"].includes(role.code)),
  };
}

/** The three resources the company views are built from, fetched in parallel. */
export function useCompanyOverview(orgnr: string | undefined) {
  const company = useAreg<CompanyResponse>(orgnr && `/${orgnr}`);
  const financials = useAreg<FinancialsResponse>(orgnr && `/${orgnr}/financials`);
  const roles = useAreg<RolesResponse>(orgnr && `/${orgnr}/roles`);
  return {
    company,
    financials,
    roles,
    isLoading: company.isLoading || financials.isLoading || roles.isLoading,
    revalidate: () => {
      company.revalidate();
      financials.revalidate();
      roles.revalidate();
    },
  };
}
