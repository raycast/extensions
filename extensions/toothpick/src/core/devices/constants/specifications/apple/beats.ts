import { DeviceDefinition } from "../../../devices.types";

export default {
  // "0x????": {
  // name: "Beats X",
  // main: "icons/devices/apple/beats.earphones.svg",
  // },
  "0x2010": {
    name: "Beats Flex",
    main: "icons/devices/apple/beats.earphones.svg",
  },
  // "0x????": {
  //   name: "Beats Solo 3",
  //   main: "icons/devices/apple/beats.headphones.svg",
  // },
  "0x200C": {
    name: "Beats Solo Pro",
    main: "icons/devices/apple/beats.headphones.svg",
  },
  "0x2012": {
    name: "Beats Fit Pro",
    main: "icons/devices/apple/beats.fit.pro.svg",
    case: "icons/devices/apple/extra/beats.fit.pro.case.svg",
    left: "icons/devices/apple/extra/beats.fit.pro.left.svg",
    right: "icons/devices/apple/extra/beats.fit.pro.right.svg",
  },
  // "0x????": {
  //   name: "Beats Powerbeats",
  //   main: "icons/devices/apple/beats.powerbeats.svg",
  // },
  // "0x????": {
  //   name: "Beats Powerbeats 3",
  //   main: "icons/devices/apple/beats.powerbeats.3.svg",
  // },
  // "0x????": {
  //   name: "Beats Powerbeats Pro",
  //   main: "icons/devices/apple/beats.powerbeats.pro.svg",
  //   case: "icons/devices/apple/extra/beats.powerbeats.pro.case.svg",
  //   left: "icons/devices/apple/extra/beats.powerbeats.pro.left.svg",
  //   right: "icons/devices/apple/extra/beats.powerbeats.pro.right.svg",
  // },
  // "0x????": {
  //   name: "Beats Studio 3",
  //   main: "icons/devices/apple/beats.headphones.svg",
  // },
  "0x2011": {
    name: "Beats Studio Buds",
    main: "icons/devices/apple/beats.studio.buds.svg",
    case: "icons/devices/apple/extra/beats.studio.buds.case.svg",
    left: "icons/devices/apple/extra/beats.studio.buds.left.svg",
    right: "icons/devices/apple/extra/beats.studio.buds.right.svg",
  },
} as Record<string, DeviceDefinition>;
