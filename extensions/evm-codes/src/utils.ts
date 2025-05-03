import { Hardfork } from "@ethereumjs/common";
import { Opcode } from "@ethereumjs/evm/src/opcodes";

export const HARDFORK_ICONS: any = {
  [Hardfork.Chainstart]: "⛓️",
  [Hardfork.Homestead]: "🏠",
  [Hardfork.Dao]: "🏛️",
  [Hardfork.TangerineWhistle]: "🍊",
  [Hardfork.SpuriousDragon]: "🐉",
  [Hardfork.Byzantium]: "🕌",
  [Hardfork.Constantinople]: "👨‍🎨",
  [Hardfork.Petersburg]: "🇷🇺",
  [Hardfork.Istanbul]: "🇹🇷",
  [Hardfork.MuirGlacier]: "🏔️",
  [Hardfork.Berlin]: "🇩🇪",
  [Hardfork.London]: "🇬🇧",
  [Hardfork.ArrowGlacier]: "🏹🏔️",
  [Hardfork.ArrowGlacier]: "⬜🏔️",
  [Hardfork.MergeForkIdTransition]: "🍴",
  [Hardfork.Merge]: "🧬",
  [Hardfork.Shanghai]: "🌉",
  [Hardfork.ShardingForkDev]: "✨",
};

export const getOpIcon = (op: Opcode) => {
  if (OP_ICONS[op.name]) {
    return OP_ICONS[op.name];
  } else if (op.code == 5) {
    return OP_ICONS["DIV"];
  } else if (op.code >= 5 && op.code <= 9) {
    return "arb_arithmetic.png";
  } else if (op.code == 0x10 || op.code == 0x12) {
    return OP_ICONS["LT"];
  } else if (op.code == 0x11 || op.code == 0x13) {
    return OP_ICONS["GT"];
  } else if (op.code == 0x1d) {
    return OP_ICONS["SHR"];
  } else if (op.code >= 0x5f && op.code <= 0x7f) {
    return OP_ICONS["PUSH"];
  } else if (op.code >= 0x90 && op.code <= 0x9f) {
    return OP_ICONS["SWAP"];
  } else if (op.code >= 0x80 && op.code <= 0x8f) {
    return OP_ICONS["DUP"];
  } else if (op.code >= 0xa0 && op.code <= 0xa4) {
    return OP_ICONS["LOG"];
  } else if (op.code == 0xf5) {
    // create2
    return OP_ICONS["CREATE"];
  } else if (op.code == 0xf2 || op.code == 0xf4 || op.code == 0xfa) {
    // callcode, delegatecall, staticcall
    return OP_ICONS["CALL"];
  }
};

export const OP_ICONS: any = {
  STOP: "🛑", // 0x00
  ADD: "➕", // 0x01
  MUL: "✖️", // 0x02
  SUB: "➖", // 0x03
  DIV: "➗", // 0x04 & 0x05
  EXP: "🔢", // 0x0a
  SIGNEXTEND: "➖", // 0x0b
  LT: "lt.png", // 0x10 & 0x12
  GT: "gt.png", // 0x11 & 0x13
  EQ: "🟰", // 0x14
  ISZERO: "0️⃣", // 0x15
  AND: "and.png", // 0x16
  OR: "or.png", // 0x17
  XOR: "xor.png", // 0x18
  NOT: "not.png", // 0x19
  BYTE: "🔡", // 0x1a
  SHL: "shl.png", // 0x1b
  SHR: "shr.png", // 0x1c
  SHA3: "🔑", // 0x20
  ADDRESS: "🏠", // 0x30
  BALANCE: "💰", // 0x31
  ORIGIN: "👨‍🎨", // 0x32
  CALLER: "📞", // 0x33
  CALLVALUE: "💰", // 0x34
  CALLDATALOAD: "📥", // 0x35
  CALLDATASIZE: "📏", // 0x36
  CALLDATACOPY: "📥", // 0x37
  CODESIZE: "📏", // 0x38
  CODECOPY: "📥", // 0x39
  GASPRICE: "⛽", // 0x3a
  EXTCODESIZE: "📏", // 0x3b
  EXTCODECOPY: "📥", // 0x3c
  RETURNDATASIZE: "📏", // 0x3d
  RETURNDATACOPY: "📥", // 0x3e
  EXTCODEHASH: "🔑", // 0x3f
  BLOCKHASH: "🔑", // 0x40
  COINBASE: "🏦", // 0x41
  TIMESTAMP: "⏰", // 0x42
  NUMBER: "🔢", // 0x43
  DIFFICULTY: "📈", // 0x44
  GASLIMIT: "⛽", // 0x45
  CHAINID: "🔗", // 0x46
  SELFBALANCE: "💰", // 0x47
  POP: "🗑️", // 0x50
  MLOAD: "📥", // 0x51
  MSTORE: "📚", // 0x52
  MSTORE8: "📚", // 0x53
  SLOAD: "📥", // 0x54
  SSTORE: "📚", // 0x55
  JUMP: "🤹‍♂️", // 0x56
  JUMPI: "🤹‍♂️", // 0x57
  PC: "🖥️", // 0x58
  MSIZE: "📏", // 0x59
  GAS: "⛽", // 0x5a
  JUMPDEST: "🎯", // 0x5b
  PUSH: "⤴️", // 0x5f-0x7f
  SWAP: "🔄", // 0x90-0x9f
  DUP: "🧑‍🤝‍🧑", // 0x80-0x8f
  LOG: "📝", // 0xa0-0xa4
  CREATE: "🏭", // 0xf0
  CALL: "📞", // 0xf1
  RETURN: "✅", // 0xf2
  REVERT: "🛑", // 0xfd
  INVALID: "🚫", // 0xfe
  SELFDESTRUCT: "💣", // 0xff
};

export const PRECOMPILE_NAMES = [
  "ecrecover",
  "sha256",
  "ripemd160",
  "identity",
  "modexp",
  "alt_bn128_add",
  "alt_bn128_mul",
  "alt_bn128_pairing",
  "blake2f",
];
