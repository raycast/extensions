import { Domain, DomainGroup } from "./interface";

export const groupDomains = (domains: Domain[], filter: string): DomainGroup[] => {
  return Object.values(
    domains.reduce((acc: Record<string, DomainGroup>, domain) => {
      const key = domain.domain_group;

      if (!acc[key]) {
        acc[key] = {
          id: key,
          name: domain.domain_group_name,
          domains: [],
        };
      }

      if (filter === "all" ? true : filter === "active" ? domain.active : !domain.active) {
        acc[key].domains.push(domain);
      }

      return acc;
    }, {}),
  );
};

export const getDomainURL = (domain: Domain) => {
  if (domain.type_to) {
    return `${domain.type}://${domain.domain}`;
  } else {
    return `${domain.type}://${domain.domain}:${domain.port}`;
  }
};
