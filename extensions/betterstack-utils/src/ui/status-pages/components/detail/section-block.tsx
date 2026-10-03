import { Appearance, getSchedulePalette } from "@/common/colors";
import { StatusPageSectionGroup } from "@/domain/status-page-resource";
import { ResourceRow } from "@/ui/status-pages/components/detail/resource-row";

interface SectionBlockProps {
  section: StatusPageSectionGroup;
  appearance: Appearance;
}

export function SectionBlock({ section, appearance }: SectionBlockProps) {
  const palette = getSchedulePalette(appearance);

  return (
    <div tw="flex flex-col w-[1112px]" style={{ gap: "16px" }}>
      <span tw={`text-[20px] font-bold text-[${palette.heading}]`}>{section.name}</span>
      {section.resources.map((resource) => (
        <ResourceRow key={resource.id} resource={resource} appearance={appearance} />
      ))}
    </div>
  );
}
