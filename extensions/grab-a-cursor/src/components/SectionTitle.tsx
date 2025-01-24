interface SectionTitleProps {
  title: string;
  itemCount: number;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  itemCount,
}) => {
  return (
    <div className="flex items-center mb-2">
      <h2 className="text-lg font-semibold">
        {title} <span className="opacity-60">({itemCount})</span>
      </h2>
    </div>
  );
};
