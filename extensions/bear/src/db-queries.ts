// Limit matching notes before joining tags. Search folding is computed once per snapshot.
function searchNotes(version: 1 | 2): string {
  const joinTable = version === 2 ? "Z_5TAGS" : "Z_7TAGS";
  const noteKey = version === 2 ? "Z_5NOTES" : "Z_7NOTES";
  const tagKey = version === 2 ? "Z_13TAGS" : "Z_14TAGS";
  return `
WITH candidates AS (
  SELECT notes.*, CASE WHEN :query = '' OR search.title LIKE :pattern THEN 0 ELSE 1 END AS priority
  FROM ZSFNOTE notes JOIN bear_search search ON search.id = notes.Z_PK
  WHERE notes.ZARCHIVED = 0 AND notes.ZTRASHED = 0
    AND (notes.ZTEXT IS NOT NULL OR notes.ZENCRYPTED = 1)
    AND (:query = '' OR search.title LIKE :pattern OR search.text LIKE :pattern OR search.identifier LIKE :pattern)
    AND (:tag IS NULL OR EXISTS (
      SELECT 1 FROM ${joinTable} nt JOIN ZSFNOTETAG t ON t.Z_PK = nt.${tagKey}
      WHERE nt.${noteKey} = notes.Z_PK AND t.ZTITLE = :tag
    ))
  ORDER BY priority, notes.ZMODIFICATIONDATE DESC LIMIT 20
)
SELECT notes.ZUNIQUEIDENTIFIER AS id, notes.ZTITLE AS title, notes.ZTEXT AS text,
  notes.ZMODIFICATIONDATE AS modified_at, notes.ZCREATIONDATE AS created_at,
  group_concat(tags.ZTITLE) AS tags, notes.ZENCRYPTED AS encrypted,
  ${version === 2 ? "notes.ZPINNED" : "0"} AS pinned
FROM candidates notes
LEFT JOIN ${joinTable} nt ON nt.${noteKey} = notes.Z_PK
LEFT JOIN ZSFNOTETAG tags ON tags.Z_PK = nt.${tagKey}
GROUP BY notes.Z_PK
ORDER BY notes.priority, notes.ZMODIFICATIONDATE DESC
`;
}
export const SEARCH_NOTES_V1 = searchNotes(1);
export const SEARCH_NOTES_V2 = searchNotes(2);

export const SEARCH_BACKLINKS_V1 = `
  SELECT DISTINCT
  note.ZUNIQUEIDENTIFIER AS id,
  note.ZTITLE AS title,
  note.ZTEXT AS text,
  note.ZMODIFICATIONDATE AS modified_at,
  note.ZCREATIONDATE AS created_at,
  note.ZENCRYPTED AS encrypted,
  group_concat(tag.ZTITLE) AS tags
FROM
	ZSFNOTE note
	LEFT OUTER JOIN Z_7TAGS nTag ON note.Z_PK = nTag.Z_7NOTES
	LEFT OUTER JOIN ZSFNOTETAG tag ON nTag.Z_14TAGS = tag.Z_PK
WHERE
	note.ZUNIQUEIDENTIFIER in(
		SELECT
			src.ZUNIQUEIDENTIFIER FROM ZSFNOTE src
			JOIN Z_7LINKEDNOTES lnk ON lnk.Z_7LINKEDBYNOTES = src.Z_PK
			JOIN ZSFNOTE trgt ON lnk.Z_7LINKEDNOTES = trgt.Z_PK
		WHERE
			trgt.ZUNIQUEIDENTIFIER LIKE :id )
GROUP BY
	note.ZUNIQUEIDENTIFIER
ORDER BY
	note.ZMODIFICATIONDATE DESC
LIMIT 400
`;

export const SEARCH_BACKLINKS_V2 = `
SELECT DISTINCT
	note.ZUNIQUEIDENTIFIER AS id,
	note.ZTITLE AS title,
	note.ZTEXT AS text,
	note.ZMODIFICATIONDATE AS modified_at,
  note.ZCREATIONDATE AS created_at,
  note.ZENCRYPTED AS encrypted,
	group_concat(tag.ZTITLE) AS tags
FROM
	ZSFNOTE note
	LEFT OUTER JOIN Z_5TAGS nTag ON note.Z_PK = nTag.Z_5NOTES
	LEFT OUTER JOIN ZSFNOTETAG tag ON nTag.Z_13TAGS = tag.Z_PK
WHERE
	note.ZUNIQUEIDENTIFIER in(
		SELECT
			origin.ZUNIQUEIDENTIFIER FROM ZSFNOTE origin
			JOIN ZSFNOTEBACKLINK link ON origin.Z_PK = link.ZLINKEDBY
			JOIN ZSFNOTE target ON target.Z_PK = link.ZLINKINGTO
		WHERE
			target.ZUNIQUEIDENTIFIER LIKE :id)
GROUP BY
	note.ZUNIQUEIDENTIFIER
ORDER BY
	note.ZMODIFICATIONDATE DESC
LIMIT 400
`;

export const SEARCH_LINKS_V1 = `
SELECT DISTINCT
  note.ZUNIQUEIDENTIFIER AS id,
  note.ZTITLE AS title,
  note.ZTEXT AS text,
  note.ZMODIFICATIONDATE AS modified_at,
  note.ZCREATIONDATE AS created_at,
  note.ZENCRYPTED AS encrypted,
  group_concat(tag.ZTITLE) AS tags
FROM
	ZSFNOTE note
	LEFT OUTER JOIN Z_7TAGS nTag ON note.Z_PK = nTag.Z_7NOTES
	LEFT OUTER JOIN ZSFNOTETAG tag ON nTag.Z_14TAGS = tag.Z_PK
WHERE
	note.ZUNIQUEIDENTIFIER in(
		SELECT
			trgt.ZUNIQUEIDENTIFIER FROM ZSFNOTE src
			JOIN Z_7LINKEDNOTES lnk ON lnk.Z_7LINKEDBYNOTES = src.Z_PK
			JOIN ZSFNOTE trgt ON lnk.Z_7LINKEDNOTES = trgt.Z_PK
		WHERE
			src.ZUNIQUEIDENTIFIER LIKE :id )
GROUP BY
	note.ZUNIQUEIDENTIFIER
ORDER BY
	note.ZMODIFICATIONDATE DESC
LIMIT 400
`;

export const SEARCH_LINKS_V2 = `
SELECT DISTINCT
	note.ZUNIQUEIDENTIFIER AS id,
	note.ZTITLE AS title,
	note.ZTEXT AS text,
	note.ZMODIFICATIONDATE AS modified_at,
  note.ZCREATIONDATE AS created_at,
  note.ZENCRYPTED AS encrypted,
	group_concat(tag.ZTITLE) AS tags
FROM
	ZSFNOTE note
	LEFT OUTER JOIN Z_5TAGS nTag ON note.Z_PK = nTag.Z_5NOTES
	LEFT OUTER JOIN ZSFNOTETAG tag ON nTag.Z_13TAGS = tag.Z_PK
WHERE
	note.ZUNIQUEIDENTIFIER in( SELECT DISTINCT
			target.ZUNIQUEIDENTIFIER FROM ZSFNOTE origin
			JOIN ZSFNOTEBACKLINK link ON origin.Z_PK = link.ZLINKEDBY
			JOIN ZSFNOTE target ON target.Z_PK = link.ZLINKINGTO
		WHERE
			origin.ZUNIQUEIDENTIFIER LIKE :id)
GROUP BY
	note.ZUNIQUEIDENTIFIER
ORDER BY
	note.ZMODIFICATIONDATE DESC
LIMIT 400
`;

export const TABLE_EXISTS = `SELECT name FROM sqlite_master WHERE type='table' AND name=:name`;

export const ALL_TAGS_V1 = `
SELECT DISTINCT 
  tags.ZTITLE AS tags 
FROM
  ZSFNOTE AS notes
  LEFT OUTER JOIN Z_7TAGS AS notes_to_tags ON notes.Z_PK = notes_to_tags.Z_7NOTES
  LEFT OUTER JOIN ZSFNOTETAG AS tags ON notes_to_tags.Z_14TAGS = tags.Z_PK 
-- Ignore tags for trashed and archived notes
WHERE notes.ZARCHIVED = 0 AND notes.ZTRASHED = 0
ORDER BY tags.ZTITLE ASC
`;
export const ALL_TAGS_V2 = `
SELECT DISTINCT 
  tags.ZTITLE AS tags 
FROM
  ZSFNOTE AS notes
  LEFT OUTER JOIN Z_5TAGS AS notes_to_tags ON notes.Z_PK = notes_to_tags.Z_5NOTES
  LEFT OUTER JOIN ZSFNOTETAG AS tags ON notes_to_tags.Z_13TAGS = tags.Z_PK 
-- Ignore tags for trashed and archived notes
WHERE notes.ZARCHIVED = 0 AND notes.ZTRASHED = 0
ORDER BY tags.ZTITLE ASC
`;
