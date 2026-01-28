const isStaging = false;

export const webUrl = isStaging ? `https://staging.sublime.app` : `https://sublime.app`;
export const getCardUrl = ({ entity_type, slug }: { entity_type: string; slug: string }) =>
    entity_type === "collection.collection"
        ? `${webUrl}/collection/${slug}`
        : entity_type === "actor.member"
          ? `${webUrl}/${slug}`
          : `${webUrl}/card/${slug}`;

export const apiUrl = isStaging ? `https://staging.api.sublime.app/api/v2` : `https://api.sublime.app/api/v2`;
