import { LocalStorage } from "@raycast/api";

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function getTerms(): Promise<GlossaryTerm[]> {
  const terms = await LocalStorage.getItem<string>("glossary-terms");
  return terms ? JSON.parse(terms) : [];
}

export async function insertTerm(
  term: Omit<GlossaryTerm, "id" | "createdAt" | "updatedAt">,
): Promise<GlossaryTerm> {
  const terms = await getTerms();

  // Check if term already exists (case-insensitive)
  const existingTerm = terms.find(
    (t) => t.term.toLowerCase() === term.term.toLowerCase(),
  );

  if (existingTerm) {
    // Update existing term
    const updatedTerm: GlossaryTerm = {
      ...existingTerm,
      definition: term.definition,
      updatedAt: new Date().toISOString(),
    };

    const updatedTerms = terms.map((t) =>
      t.id === existingTerm.id ? updatedTerm : t,
    );
    await LocalStorage.setItem("glossary-terms", JSON.stringify(updatedTerms));
    return updatedTerm;
  } else {
    // Create new term
    const newTerm: GlossaryTerm = {
      ...term,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await LocalStorage.setItem(
      "glossary-terms",
      JSON.stringify([...terms, newTerm]),
    );
    return newTerm;
  }
}

export async function checkTermExists(
  termName: string,
): Promise<GlossaryTerm | null> {
  const terms = await getTerms();
  return (
    terms.find((t) => t.term.toLowerCase() === termName.toLowerCase()) || null
  );
}

export async function searchTerms(
  query: string,
  term?: string,
): Promise<GlossaryTerm[]> {
  const terms = await getTerms();
  const searchQuery = query.toLowerCase();
  const searchTerm = term?.toLowerCase();

  return terms.filter((term) => {
    const termLower = term.term.toLowerCase();
    const definitionLower = term.definition.toLowerCase();

    const matchesTermFilter = searchTerm
      ? termLower.includes(searchTerm)
      : true;
    const matchesQuery =
      termLower.includes(searchQuery) || definitionLower.includes(searchQuery);

    return matchesTermFilter && matchesQuery;
  });
}

export async function importTerms(
  terms: Omit<GlossaryTerm, "id" | "createdAt" | "updatedAt">[],
): Promise<GlossaryTerm[]> {
  const existingTerms = await getTerms();

  // Create a map of existing terms by term name for quick lookup
  const existingTermsMap = new Map<string, GlossaryTerm>();
  existingTerms.forEach((term) => {
    existingTermsMap.set(term.term.toLowerCase(), term);
  });

  const importedTerms: GlossaryTerm[] = [];
  const updatedTerms: GlossaryTerm[] = [];

  terms.forEach((term) => {
    const existingTerm = existingTermsMap.get(term.term.toLowerCase());

    if (existingTerm) {
      // Update existing term
      const updatedTerm: GlossaryTerm = {
        ...existingTerm,
        definition: term.definition,
        updatedAt: new Date().toISOString(),
      };
      updatedTerms.push(updatedTerm);
    } else {
      // Create new term
      const newTerm: GlossaryTerm = {
        ...term,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      importedTerms.push(newTerm);
    }
  });

  // Combine existing terms (excluding those that were updated), updated terms, and new terms
  const finalTerms = [
    ...existingTerms.filter(
      (term) => !updatedTerms.some((updated) => updated.id === term.id),
    ),
    ...updatedTerms,
    ...importedTerms,
  ];

  await LocalStorage.setItem("glossary-terms", JSON.stringify(finalTerms));
  return [...updatedTerms, ...importedTerms];
}

export async function updateTerm(
  id: string,
  updates: Partial<Omit<GlossaryTerm, "id" | "createdAt" | "updatedAt">>,
): Promise<GlossaryTerm> {
  const terms = await getTerms();
  const termIndex = terms.findIndex((t) => t.id === id);

  if (termIndex === -1) {
    throw new Error("Term not found");
  }

  const updatedTerm: GlossaryTerm = {
    ...terms[termIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  terms[termIndex] = updatedTerm;
  await LocalStorage.setItem("glossary-terms", JSON.stringify(terms));
  return updatedTerm;
}

export async function deleteTerm(id: string): Promise<void> {
  const terms = await getTerms();
  const updatedTerms = terms.filter((t) => t.id !== id);
  await LocalStorage.setItem("glossary-terms", JSON.stringify(updatedTerms));
}

export async function deleteAllTerms(): Promise<void> {
  await LocalStorage.setItem("glossary-terms", JSON.stringify([]));
}
