import { Resume } from "../types/resume";

/** Render validated JSON Resume data, including legacy aliases used by older resumes. */
export function makeMarkdownFromResume(resume: Resume): string {
  const basics = resume.basics ?? {};
  const lines = [`# ${basics.name || "(no name)"}`];
  const add = (value?: string) => {
    if (value) lines.push(value);
  };
  const join = (values: (string | undefined)[], separator = " — ") => values.filter(Boolean).join(separator);
  const dates = (entry: { startDate?: string; endDate?: string }) => {
    const value = join([entry.startDate, entry.endDate]);
    if (value) add(`*${value}*`);
  };
  const bullets = (values?: string[]) => values?.forEach((value) => add(value ? `- ${value}` : undefined));
  const section = <T>(title: string, entries: T[] | undefined, render: (entry: T) => void) => {
    if (!entries?.length) return;
    lines.push("---", `## ${title}`);
    entries.forEach(render);
  };

  if (basics.label) add(`**${basics.label}**`);
  const location = basics.location;
  if (location)
    add(join([location.address, location.city, location.region, location.postalCode, location.countryCode], ", "));
  add(
    join(
      [
        basics.email && `Email: ${basics.email}`,
        basics.phone && `Phone: ${basics.phone}`,
        (basics.url || basics.website) && `Website: ${basics.url || basics.website}`,
      ],
      " • ",
    ),
  );
  add(basics.summary);
  section("Profiles", basics.profiles, (profile) => {
    add(`- ${join([profile.network, profile.username, profile.url]) || "Profile"}`);
  });
  section("Skills", resume.skills, (skill) => {
    add(`- ${join([skill.name || "Skill", skill.level, skill.keywords?.join(", ")])}`);
  });
  section("Work Experience", resume.work, (work) => {
    add(`### ${join([work.position, work.name || work.company]) || "Work"}`);
    dates(work);
    add(work.location);
    add(work.description);
    add(work.url || work.website);
    add(work.summary);
    bullets(work.highlights);
  });
  section("Volunteer", resume.volunteer, (volunteer) => {
    add(`### ${join([volunteer.position, volunteer.organization]) || "Volunteer"}`);
    dates(volunteer);
    add(volunteer.url);
    add(volunteer.summary);
    bullets(volunteer.highlights);
  });
  section("Education", resume.education, (education) => {
    add(`### ${education.institution || "Education"}`);
    add(join([education.studyType, education.area]));
    dates(education);
    add(education.url);
    const score = education.score || education.gpa;
    if (score) add(`Score: ${score}`);
    add(education.summary);
    bullets(education.courses);
  });
  section("Projects", resume.projects, (project) => {
    add(`### ${project.name || "Project"}`);
    dates(project);
    add(join([project.entity, project.type]));
    add(project.roles?.join(", "));
    add(project.url);
    add(project.description);
    bullets(project.highlights);
    add(project.keywords?.join(", "));
  });
  section("Awards", resume.awards, (award) => {
    add(`### ${award.title || "Award"}`);
    add(join([award.awarder, award.date]));
    add(award.summary);
  });
  section("Certificates", resume.certificates, (certificate) => {
    add(`### ${certificate.name || "Certificate"}`);
    add(join([certificate.issuer, certificate.date]));
    add(certificate.url);
  });
  section("Publications", resume.publications, (publication) => {
    add(`### ${publication.name || "Publication"}`);
    add(join([publication.publisher, publication.releaseDate]));
    add(publication.url);
    add(publication.summary);
  });
  section("Languages", resume.languages, (language) => {
    add(`- ${join([language.language, language.fluency]) || "Language"}`);
  });
  section("Interests", resume.interests, (interest) => {
    add(`- ${join([interest.name, interest.keywords?.join(", ")]) || "Interest"}`);
  });
  section("References", resume.references, (reference) => {
    add(`### ${reference.name || "Reference"}`);
    add(reference.reference);
  });
  return lines.join("\n\n");
}
