// Captured from `ioreg -r -d 1 -k cluster-type` on an M1 Pro (2026-09-02), trimmed to the properties
// the parser and a reader need: each cpu node keeps its header line plus `device_type`, `cpu-id`,
// `cluster-type`, `cluster-id`, `name` and `compatible`, verbatim; the remaining ~30 register and
// frequency properties per node were removed. cpu-id 0–1 are the Efficiency cluster (icestorm),
// 2–9 the Performance clusters (firestorm); a background-QoS load test confirmed os.cpus() indices
// 0 and 1 are the ones that absorb background work. The parser is generation-agnostic and rejects
// any capture whose cpu-ids do not cover 0…n-1 exactly once, so one real capture is sufficient.
export const IOREG_CLUSTER_TYPE_M1_PRO = `
+-o cpu0@0  <class IOPlatformDevice, id 0x100000280, registered, matched, active, busy 0 (98 ms), retain 8>
    {
      "cluster-id" = <00000000>
      "cpu-id" = <00000000>
      "name" = <"cpu0">
      "cluster-type" = <"E">
      "device_type" = <"cpu">
      "compatible" = <"apple,icestorm","ARM,v8">
    }
+-o cpu1@1  <class IOPlatformDevice, id 0x100000281, registered, matched, active, busy 0 (241 ms), retain 8>
    {
      "cluster-type" = <"E">
      "cpu-id" = <01000000>
      "name" = <"cpu1">
      "compatible" = <"apple,icestorm","ARM,v8">
      "cluster-id" = <00000000>
      "device_type" = <"cpu">
    }
+-o cpu2@100  <class IOPlatformDevice, id 0x100000282, registered, matched, active, busy 0 (240 ms), retain 8>
    {
      "cluster-type" = <"P">
      "cpu-id" = <02000000>
      "name" = <"cpu2">
      "compatible" = <"apple,firestorm","ARM,v8">
      "cluster-id" = <01000000>
      "device_type" = <"cpu">
    }
+-o cpu3@101  <class IOPlatformDevice, id 0x100000283, registered, matched, active, busy 0 (248 ms), retain 8>
    {
      "cluster-type" = <"P">
      "cpu-id" = <03000000>
      "name" = <"cpu3">
      "compatible" = <"apple,firestorm","ARM,v8">
      "cluster-id" = <01000000>
      "device_type" = <"cpu">
    }
+-o cpu4@102  <class IOPlatformDevice, id 0x100000284, registered, matched, active, busy 0 (273 ms), retain 8>
    {
      "cluster-type" = <"P">
      "cpu-id" = <04000000>
      "name" = <"cpu4">
      "compatible" = <"apple,firestorm","ARM,v8">
      "cluster-id" = <01000000>
      "device_type" = <"cpu">
    }
+-o cpu5@103  <class IOPlatformDevice, id 0x100000285, registered, matched, active, busy 0 (75 ms), retain 8>
    {
      "cluster-type" = <"P">
      "cpu-id" = <05000000>
      "name" = <"cpu5">
      "compatible" = <"apple,firestorm","ARM,v8">
      "cluster-id" = <01000000>
      "device_type" = <"cpu">
    }
+-o cpu6@200  <class IOPlatformDevice, id 0x100000286, registered, matched, active, busy 0 (63 ms), retain 8>
    {
      "cluster-type" = <"P">
      "cpu-id" = <06000000>
      "name" = <"cpu6">
      "compatible" = <"apple,firestorm","ARM,v8">
      "cluster-id" = <02000000>
      "device_type" = <"cpu">
    }
+-o cpu7@201  <class IOPlatformDevice, id 0x100000287, registered, matched, active, busy 0 (64 ms), retain 8>
    {
      "cluster-type" = <"P">
      "cpu-id" = <07000000>
      "name" = <"cpu7">
      "compatible" = <"apple,firestorm","ARM,v8">
      "cluster-id" = <02000000>
      "device_type" = <"cpu">
    }
+-o cpu8@202  <class IOPlatformDevice, id 0x100000288, registered, matched, active, busy 0 (0 ms), retain 8>
    {
      "cluster-type" = <"P">
      "cpu-id" = <08000000>
      "name" = <"cpu8">
      "compatible" = <"apple,firestorm","ARM,v8">
      "cluster-id" = <02000000>
      "device_type" = <"cpu">
    }
+-o cpu9@203  <class IOPlatformDevice, id 0x100000289, registered, matched, active, busy 0 (0 ms), retain 8>
    {
      "cluster-type" = <"P">
      "cpu-id" = <09000000>
      "name" = <"cpu9">
      "compatible" = <"apple,firestorm","ARM,v8">
      "cluster-id" = <02000000>
      "device_type" = <"cpu">
    }
`;
