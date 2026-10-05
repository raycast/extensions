import { discover } from "../api/client";

type RoleAwareProfile = {
  profileKind?: "kind" | "role";
  applicableKinds?: string[] | null;
};

type MappedProfile = {
  slug: string;
  name: string;
  profileKind: "kind" | "role";
  applicableKinds?: string[] | null;
  scope: string;
  description?: string;
  properties: Array<{
    slug: string;
    displayName: string;
    type: string;
    options?: unknown[];
    required?: boolean;
  }>;
  createCommand?: string;
};

type Input = {
  /** Optional explicit workspace ID for effective schemas. Omit for base pod-wide schemas. */
  workspaceId?: string;
};

function preferProfile(a: MappedProfile, b: MappedProfile): MappedProfile {
  const aProps = a.properties.length;
  const bProps = b.properties.length;
  if (aProps !== bProps) return aProps > bProps ? a : b;
  if (a.scope === "workspace" && b.scope !== "workspace") return a;
  if (b.scope === "workspace" && a.scope !== "workspace") return b;
  return a;
}

/** Collapse base+overlay pairs that share slug+profileKind; keep richer/workspace row. */
function dedupeProfiles(profiles: MappedProfile[]): MappedProfile[] {
  const byKey = new Map<string, MappedProfile>();
  for (const profile of profiles) {
    const key = `${profile.slug}\0${profile.profileKind}`;
    const existing = byKey.get(key);
    byKey.set(key, existing ? preferProfile(existing, profile) : profile);
  }
  return [...byKey.values()];
}

export default async function tool(input: Input) {
  const result = await discover(input.workspaceId ? { workspaceId: input.workspaceId } : undefined);

  if (!result.profiles.length) {
    return { found: false, message: "No profiles found.", profiles: [] };
  }

  const mapped = result.profiles.map((profile): MappedProfile => {
    // The shared client contract is additive: older pods omit these two
    // fields and are correctly treated as kind-only rather than role-blind.
    const p = profile as typeof profile & RoleAwareProfile;
    const profileKind = p.profileKind ?? "kind";
    return {
      slug: p.slug,
      name: p.displayName,
      profileKind,
      ...(profileKind === "role" ? { applicableKinds: p.applicableKinds ?? null } : {}),
      scope: p.scope,
      description: p.description ?? undefined,
      properties: (p.properties ?? []).map((prop) => ({
        slug: prop.slug,
        displayName: prop.displayName,
        type: prop.type,
        ...(prop.options?.length ? { options: prop.options } : {}),
        ...(prop.required ? { required: true } : {}),
      })),
      createCommand: p.createCommand,
    };
  });

  const profiles = dedupeProfiles(mapped);

  return {
    found: true,
    count: profiles.length,
    profiles,
    commands: result.commands,
    hint: "Use only profiles with profileKind `kind` as profileSlug in create-entity. Before every nontrivial write, call discover for the selected profile and use only its returned keys, constraints, defaults, and enum values. A `role` is an attachable facet, never a standalone entity. Omit workspaceId for a base pod-wide schema; pass one only after the user selects that lens. Each profile includes its property schema and a ready-to-run createCommand. Duplicates from base+overlay are merged by slug; use discover for one selected profile's full schema.",
  };
}
