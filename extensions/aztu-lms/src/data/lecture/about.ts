import { authedFetch } from "@/lib/auth";

export type Syllabus = {
  id: string;
  group: string;
  lecture_name: string;
  professor: {
    lecture_professor_name: string;
    training_professor_name: string;
    laboratory_professor_name: string | null;
  };
  score: string;
  hours: string;
  week: string;
  semester: string;
  student_count: string;
  lecture_plan: {
    object: string;
    url: string | null;
    teaching_method: string | null;
    scores: {
      lecture_score: string;
      training_score: string;
      laboratory_score: string | null;
      attend_percent: string;
      middle_percent: string;
      last_percent: string;
      etc_percent: string;
    };
  }[];
}[];

export async function getSyllabus(lectureId: string) {
  try {
    const res = await authedFetch(`lectures/${lectureId}/syllabus`, {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch syllabus");
    }

    const data = (await res.json()) as Syllabus;
    if (!Array.isArray(data)) return null;

    console.log("get Syllabus");
    return data;
  } catch (error) {
    console.log("Error fetching syllabus:", error);
    return null;
  }
}
