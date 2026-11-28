import { Form } from "@raycast/api";
import { cpus, totalmem } from "node:os";

/** Left as is, a size comes from the template or the manifest. */
export const DEFAULT = "";

/** Choices up to what this Mac has, since Lima can't give an instance more. */
const CPU_CHOICES = [1, 2, 4, 6, 8, 12, 16].filter((count) => count <= cpus().length);
const MEMORY_CHOICES = [2, 4, 6, 8, 12, 16, 24, 32].filter((size) => size * 1024 ** 3 < totalmem());
const DISK_CHOICES = [20, 50, 100, 200];

/** The choices plus the current value, so a size read from a manifest shows even when it isn't one of them. */
function withCurrent(choices: number[], current: string): number[] {
  const value = Number(current);
  return value && !choices.includes(value) ? [...choices, value].sort((a, b) => a - b) : choices;
}

export interface SizeValues {
  cpus: string;
  memory: string;
  disk: string;
  vmType: string;
}

type ItemProps<T> = { id: string; value?: T; onChange?: (value: T) => void; error?: string };

interface Props {
  values: SizeValues;
  itemProps: { [K in keyof SizeValues]: ItemProps<string> };
  /** What leaving a field as is means: "Template Default" or "As in Manifest". */
  defaultTitle: string;
}

/** CPUs, Memory, Disk and VM Type, shared by Create Instance and Run with Changes. */
export function SizeFields({ values, itemProps, defaultTitle }: Props) {
  return (
    <>
      <Form.Dropdown title="CPUs" {...itemProps.cpus}>
        <Form.Dropdown.Item title={defaultTitle} value={DEFAULT} />
        {withCurrent(CPU_CHOICES, values.cpus).map((count) => (
          <Form.Dropdown.Item key={count} title={String(count)} value={String(count)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Memory" {...itemProps.memory}>
        <Form.Dropdown.Item title={defaultTitle} value={DEFAULT} />
        {withCurrent(MEMORY_CHOICES, values.memory).map((size) => (
          <Form.Dropdown.Item key={size} title={`${size} GiB`} value={String(size)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Disk" info="Lima grows the disk file as it fills, up to this size." {...itemProps.disk}>
        <Form.Dropdown.Item title={defaultTitle} value={DEFAULT} />
        {withCurrent(DISK_CHOICES, values.disk).map((size) => (
          <Form.Dropdown.Item key={size} title={`${size} GiB`} value={String(size)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="VM Type"
        info="VZ is faster on Apple silicon. QEMU runs other architectures."
        {...itemProps.vmType}
      >
        <Form.Dropdown.Item title={defaultTitle} value={DEFAULT} />
        <Form.Dropdown.Item title="VZ" value="vz" />
        <Form.Dropdown.Item title="QEMU" value="qemu" />
      </Form.Dropdown>
    </>
  );
}

/** The flags limactl takes for the sizes picked, leaving the rest to the template or manifest. */
export function sizeOverrides(values: SizeValues) {
  return {
    cpus: Number(values.cpus) || undefined,
    memory: Number(values.memory) || undefined,
    disk: Number(values.disk) || undefined,
    vmType: values.vmType || undefined,
  };
}
