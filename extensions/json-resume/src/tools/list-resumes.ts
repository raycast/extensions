import { listResumeDocuments } from "../utils/resumeDocuments";

interface Input {
  /** Optional search across local resume titles, names, labels, and source URLs. */
  query?: string;
}

export default async function listResumes(input: Input) {
  const { documents, warnings } = await listResumeDocuments();
  const query = input.query?.trim().toLowerCase() ?? "";
  return {
    resumes: documents
      .filter((item) =>
        [item.title, item.resume.basics?.name, item.resume.basics?.label, item.sourceUrl].some((value) =>
          value?.toLowerCase().includes(query),
        ),
      )
      .map(({ id, title, resume, updatedAt, sourceUrl }) => ({
        id,
        title,
        name: resume.basics?.name,
        label: resume.basics?.label,
        updatedAt,
        sourceUrl,
      })),
    warnings,
  };
}
