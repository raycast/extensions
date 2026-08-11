import { authedFetch } from "@/lib/auth";

export type Material = {
  id: string;
  title: string;
  creator: string;
  created_at: string;
};

export async function getMaterials(lectureId: string) {
  try {
    const res = await authedFetch(`lectures/${lectureId}/materials`, {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch materials");
    }
    const data = (await res.json()) as Material[];
    if (!data) return null;

    return data;
  } catch (error) {
    console.error("Error fetching materials:", error);
    return null;
  }
}

export type MaterialDetails = {
  id: string;
  title: string;
  creator: string;
  created_at: string;
  content: string;
  files: {
    file1: {
      name: string | null;
      url: string | null;
    };
    file2: {
      name: string | null;
      url: string | null;
    };
  };
  group: null;
};

export async function getMaterialById(lectureId: string, materialId: string) {
  try {
    const res = await authedFetch(`lectures/${lectureId}/materials/${materialId}`, {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch material details");
    }
    const data = (await res.json()) as MaterialDetails;
    if (!data) return null;

    return data;
  } catch (error) {
    console.error("Error fetching material details:", error);
    return null;
  }
}

export async function getMaterialDocumentById(fileUrl: string) {
  try {
    const res = await authedFetch(`secure-download/materials/${encodeURIComponent(fileUrl)}`, { method: "GET" });

    if (!res.ok) {
      throw new Error("Failed to download material document");
    }
    const arrayBuffer = await res.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    return data;
  } catch (error) {
    console.error("Error fetching material document:", error);
    return null;
  }
}
