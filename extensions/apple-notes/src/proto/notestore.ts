/* eslint-disable */
import * as Long from "long";
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "";

/** Represents a color */
export interface Color {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

/** Represents an attachment (embedded object) */
export interface AttachmentInfo {
  attachmentIdentifier: string;
  typeUti: string;
}

/** Represents a font */
export interface Font {
  fontName: string;
  pointSize: number;
  fontHints: number;
}

/** Styles a "Paragraph" (any run of characters in an AttributeRun) */
export interface ParagraphStyle {
  styleType: number;
  alignment: number;
  indentAmount: number;
  checklist: Checklist | undefined;
}

/** Represents a checklist item */
export interface Checklist {
  uuid: Uint8Array;
  done: number;
}

/**
 * Represents an object that has pointers to a key and a value, asserting
 * somehow that the key object has to do with the value object.
 */
export interface DictionaryElement {
  key: ObjectID | undefined;
  value: ObjectID | undefined;
}

/** A Dictionary holds many DictionaryElements */
export interface Dictionary {
  element: DictionaryElement[];
}

/**
 * ObjectIDs are used to identify objects within the protobuf, offsets in an arry, or
 * a simple String.
 */
export interface ObjectID {
  unsignedIntegerValue: number;
  stringValue: string;
  objectIndex: number;
}

/** Register Latest is used to identify the most recent version */
export interface RegisterLatest {
  contents: ObjectID | undefined;
}

/** MapEntries have a key that maps to an array of key items and a value that points to an object. */
export interface MapEntry {
  key: number;
  value: ObjectID | undefined;
}

/** Represents a "run" of characters that need to be styled/displayed/etc */
export interface AttributeRun {
  length: number;
  paragraphStyle: ParagraphStyle | undefined;
  font: Font | undefined;
  fontWeight: number;
  underlined: number;
  strikethrough: number;
  /** Sign indicates super/sub */
  superscript: number;
  link: string;
  color: Color | undefined;
  attachmentInfo: AttachmentInfo | undefined;
}

/** Overarching object in a ZNOTEDATA.ZDATA blob */
export interface NoteStoreProto {
  document: Document | undefined;
}

/** A Document has a Note within it. */
export interface Document {
  version: number;
  note: Note | undefined;
}

/**
 * A Note has both text, and then a lot of formatting entries.
 * Other fields are present and not yet included in this proto.
 */
export interface Note {
  noteText: string;
  attributeRun: AttributeRun[];
}

/** Represents the top level object in a ZMERGEABLEDATA cell */
export interface MergableDataProto {
  mergableDataObject: MergableDataObject | undefined;
}

/** Similar to Document for Notes, this is what holds the mergeable object */
export interface MergableDataObject {
  /** Asserted to be version in https://github.com/dunhamsteve/notesutils */
  version: number;
  mergeableDataObjectData: MergeableDataObjectData | undefined;
}

/**
 * This is the mergeable data object itself and has a lot of entries that are the parts of it
 * along with arrays of key, type, and UUID items, depending on type.
 */
export interface MergeableDataObjectData {
  mergeableDataObjectEntry: MergeableDataObjectEntry[];
  mergeableDataObjectKeyItem: string[];
  mergeableDataObjectTypeItem: string[];
  mergeableDataObjectUuidItem: Uint8Array[];
}

/**
 * Each entry is part of the pbject. For example, one entry might be identifying which
 * UUIDs are rows, and another might hold the text of a cell.
 */
export interface MergeableDataObjectEntry {
  registerLatest: RegisterLatest | undefined;
  dictionary: Dictionary | undefined;
  note: Note | undefined;
  customMap: MergeableDataObjectMap | undefined;
  orderedSet: OrderedSet | undefined;
}

/**
 * The Object Map uses its type to identify what you are looking at and
 * then a map entry to do something with that value.
 */
export interface MergeableDataObjectMap {
  type: number;
  mapEntry: MapEntry[];
}

/** An ordered set is used to hold structural information for embedded tables */
export interface OrderedSet {
  ordering: OrderedSetOrdering | undefined;
  elements: Dictionary | undefined;
}

/**
 * The ordered set ordering identifies rows and columns in embedded tables, with an array
 * of the objects and contents that map lookup values to originals.
 */
export interface OrderedSetOrdering {
  array: OrderedSetOrderingArray | undefined;
  contents: Dictionary | undefined;
}

/**
 * This array holds both the text to replace and the array of UUIDs to tell what
 * embedded rows and columns are.
 */
export interface OrderedSetOrderingArray {
  contents: Note | undefined;
  attachment: OrderedSetOrderingArrayAttachment[];
}

/** This array identifies the UUIDs that are embedded table rows or columns */
export interface OrderedSetOrderingArrayAttachment {
  index: number;
  uuid: Uint8Array;
}

function createBaseColor(): Color {
  return { red: 0, green: 0, blue: 0, alpha: 0 };
}

export const Color = {
  encode(message: Color, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.red !== 0) {
      writer.uint32(13).float(message.red);
    }
    if (message.green !== 0) {
      writer.uint32(21).float(message.green);
    }
    if (message.blue !== 0) {
      writer.uint32(29).float(message.blue);
    }
    if (message.alpha !== 0) {
      writer.uint32(37).float(message.alpha);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Color {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseColor();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 13) {
            break;
          }

          message.red = reader.float();
          continue;
        case 2:
          if (tag !== 21) {
            break;
          }

          message.green = reader.float();
          continue;
        case 3:
          if (tag !== 29) {
            break;
          }

          message.blue = reader.float();
          continue;
        case 4:
          if (tag !== 37) {
            break;
          }

          message.alpha = reader.float();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Color {
    return {
      red: isSet(object.red) ? Number(object.red) : 0,
      green: isSet(object.green) ? Number(object.green) : 0,
      blue: isSet(object.blue) ? Number(object.blue) : 0,
      alpha: isSet(object.alpha) ? Number(object.alpha) : 0,
    };
  },

  toJSON(message: Color): unknown {
    const obj: any = {};
    message.red !== undefined && (obj.red = message.red);
    message.green !== undefined && (obj.green = message.green);
    message.blue !== undefined && (obj.blue = message.blue);
    message.alpha !== undefined && (obj.alpha = message.alpha);
    return obj;
  },

  create<I extends Exact<DeepPartial<Color>, I>>(base?: I): Color {
    return Color.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Color>, I>>(object: I): Color {
    const message = createBaseColor();
    message.red = object.red ?? 0;
    message.green = object.green ?? 0;
    message.blue = object.blue ?? 0;
    message.alpha = object.alpha ?? 0;
    return message;
  },
};

function createBaseAttachmentInfo(): AttachmentInfo {
  return { attachmentIdentifier: "", typeUti: "" };
}

export const AttachmentInfo = {
  encode(message: AttachmentInfo, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.attachmentIdentifier !== "") {
      writer.uint32(10).string(message.attachmentIdentifier);
    }
    if (message.typeUti !== "") {
      writer.uint32(18).string(message.typeUti);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AttachmentInfo {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAttachmentInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.attachmentIdentifier = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.typeUti = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AttachmentInfo {
    return {
      attachmentIdentifier: isSet(object.attachmentIdentifier) ? String(object.attachmentIdentifier) : "",
      typeUti: isSet(object.typeUti) ? String(object.typeUti) : "",
    };
  },

  toJSON(message: AttachmentInfo): unknown {
    const obj: any = {};
    message.attachmentIdentifier !== undefined && (obj.attachmentIdentifier = message.attachmentIdentifier);
    message.typeUti !== undefined && (obj.typeUti = message.typeUti);
    return obj;
  },

  create<I extends Exact<DeepPartial<AttachmentInfo>, I>>(base?: I): AttachmentInfo {
    return AttachmentInfo.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<AttachmentInfo>, I>>(object: I): AttachmentInfo {
    const message = createBaseAttachmentInfo();
    message.attachmentIdentifier = object.attachmentIdentifier ?? "";
    message.typeUti = object.typeUti ?? "";
    return message;
  },
};

function createBaseFont(): Font {
  return { fontName: "", pointSize: 0, fontHints: 0 };
}

export const Font = {
  encode(message: Font, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fontName !== "") {
      writer.uint32(10).string(message.fontName);
    }
    if (message.pointSize !== 0) {
      writer.uint32(21).float(message.pointSize);
    }
    if (message.fontHints !== 0) {
      writer.uint32(24).int32(message.fontHints);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Font {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFont();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.fontName = reader.string();
          continue;
        case 2:
          if (tag !== 21) {
            break;
          }

          message.pointSize = reader.float();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.fontHints = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Font {
    return {
      fontName: isSet(object.fontName) ? String(object.fontName) : "",
      pointSize: isSet(object.pointSize) ? Number(object.pointSize) : 0,
      fontHints: isSet(object.fontHints) ? Number(object.fontHints) : 0,
    };
  },

  toJSON(message: Font): unknown {
    const obj: any = {};
    message.fontName !== undefined && (obj.fontName = message.fontName);
    message.pointSize !== undefined && (obj.pointSize = message.pointSize);
    message.fontHints !== undefined && (obj.fontHints = Math.round(message.fontHints));
    return obj;
  },

  create<I extends Exact<DeepPartial<Font>, I>>(base?: I): Font {
    return Font.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Font>, I>>(object: I): Font {
    const message = createBaseFont();
    message.fontName = object.fontName ?? "";
    message.pointSize = object.pointSize ?? 0;
    message.fontHints = object.fontHints ?? 0;
    return message;
  },
};

function createBaseParagraphStyle(): ParagraphStyle {
  return { styleType: 0, alignment: 0, indentAmount: 0, checklist: undefined };
}

export const ParagraphStyle = {
  encode(message: ParagraphStyle, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.styleType !== 0) {
      writer.uint32(8).int32(message.styleType);
    }
    if (message.alignment !== 0) {
      writer.uint32(16).int32(message.alignment);
    }
    if (message.indentAmount !== 0) {
      writer.uint32(32).int32(message.indentAmount);
    }
    if (message.checklist !== undefined) {
      Checklist.encode(message.checklist, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ParagraphStyle {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParagraphStyle();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.styleType = reader.int32();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.alignment = reader.int32();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.indentAmount = reader.int32();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.checklist = Checklist.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ParagraphStyle {
    return {
      styleType: isSet(object.styleType) ? Number(object.styleType) : 0,
      alignment: isSet(object.alignment) ? Number(object.alignment) : 0,
      indentAmount: isSet(object.indentAmount) ? Number(object.indentAmount) : 0,
      checklist: isSet(object.checklist) ? Checklist.fromJSON(object.checklist) : undefined,
    };
  },

  toJSON(message: ParagraphStyle): unknown {
    const obj: any = {};
    message.styleType !== undefined && (obj.styleType = Math.round(message.styleType));
    message.alignment !== undefined && (obj.alignment = Math.round(message.alignment));
    message.indentAmount !== undefined && (obj.indentAmount = Math.round(message.indentAmount));
    message.checklist !== undefined &&
      (obj.checklist = message.checklist ? Checklist.toJSON(message.checklist) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<ParagraphStyle>, I>>(base?: I): ParagraphStyle {
    return ParagraphStyle.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ParagraphStyle>, I>>(object: I): ParagraphStyle {
    const message = createBaseParagraphStyle();
    message.styleType = object.styleType ?? 0;
    message.alignment = object.alignment ?? 0;
    message.indentAmount = object.indentAmount ?? 0;
    message.checklist = (object.checklist !== undefined && object.checklist !== null)
      ? Checklist.fromPartial(object.checklist)
      : undefined;
    return message;
  },
};

function createBaseChecklist(): Checklist {
  return { uuid: new Uint8Array(), done: 0 };
}

export const Checklist = {
  encode(message: Checklist, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.uuid.length !== 0) {
      writer.uint32(10).bytes(message.uuid);
    }
    if (message.done !== 0) {
      writer.uint32(16).int32(message.done);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Checklist {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseChecklist();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.uuid = reader.bytes();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.done = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Checklist {
    return {
      uuid: isSet(object.uuid) ? bytesFromBase64(object.uuid) : new Uint8Array(),
      done: isSet(object.done) ? Number(object.done) : 0,
    };
  },

  toJSON(message: Checklist): unknown {
    const obj: any = {};
    message.uuid !== undefined &&
      (obj.uuid = base64FromBytes(message.uuid !== undefined ? message.uuid : new Uint8Array()));
    message.done !== undefined && (obj.done = Math.round(message.done));
    return obj;
  },

  create<I extends Exact<DeepPartial<Checklist>, I>>(base?: I): Checklist {
    return Checklist.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Checklist>, I>>(object: I): Checklist {
    const message = createBaseChecklist();
    message.uuid = object.uuid ?? new Uint8Array();
    message.done = object.done ?? 0;
    return message;
  },
};

function createBaseDictionaryElement(): DictionaryElement {
  return { key: undefined, value: undefined };
}

export const DictionaryElement = {
  encode(message: DictionaryElement, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== undefined) {
      ObjectID.encode(message.key, writer.uint32(10).fork()).ldelim();
    }
    if (message.value !== undefined) {
      ObjectID.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DictionaryElement {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDictionaryElement();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.key = ObjectID.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.value = ObjectID.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DictionaryElement {
    return {
      key: isSet(object.key) ? ObjectID.fromJSON(object.key) : undefined,
      value: isSet(object.value) ? ObjectID.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: DictionaryElement): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key ? ObjectID.toJSON(message.key) : undefined);
    message.value !== undefined && (obj.value = message.value ? ObjectID.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<DictionaryElement>, I>>(base?: I): DictionaryElement {
    return DictionaryElement.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<DictionaryElement>, I>>(object: I): DictionaryElement {
    const message = createBaseDictionaryElement();
    message.key = (object.key !== undefined && object.key !== null) ? ObjectID.fromPartial(object.key) : undefined;
    message.value = (object.value !== undefined && object.value !== null)
      ? ObjectID.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseDictionary(): Dictionary {
  return { element: [] };
}

export const Dictionary = {
  encode(message: Dictionary, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.element) {
      DictionaryElement.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Dictionary {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDictionary();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.element.push(DictionaryElement.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Dictionary {
    return {
      element: Array.isArray(object?.element) ? object.element.map((e: any) => DictionaryElement.fromJSON(e)) : [],
    };
  },

  toJSON(message: Dictionary): unknown {
    const obj: any = {};
    if (message.element) {
      obj.element = message.element.map((e) => e ? DictionaryElement.toJSON(e) : undefined);
    } else {
      obj.element = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Dictionary>, I>>(base?: I): Dictionary {
    return Dictionary.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Dictionary>, I>>(object: I): Dictionary {
    const message = createBaseDictionary();
    message.element = object.element?.map((e) => DictionaryElement.fromPartial(e)) || [];
    return message;
  },
};

function createBaseObjectID(): ObjectID {
  return { unsignedIntegerValue: 0, stringValue: "", objectIndex: 0 };
}

export const ObjectID = {
  encode(message: ObjectID, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.unsignedIntegerValue !== 0) {
      writer.uint32(16).uint64(message.unsignedIntegerValue);
    }
    if (message.stringValue !== "") {
      writer.uint32(34).string(message.stringValue);
    }
    if (message.objectIndex !== 0) {
      writer.uint32(48).int32(message.objectIndex);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ObjectID {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseObjectID();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          if (tag !== 16) {
            break;
          }

          message.unsignedIntegerValue = longToNumber(reader.uint64() as Long);
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.stringValue = reader.string();
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.objectIndex = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ObjectID {
    return {
      unsignedIntegerValue: isSet(object.unsignedIntegerValue) ? Number(object.unsignedIntegerValue) : 0,
      stringValue: isSet(object.stringValue) ? String(object.stringValue) : "",
      objectIndex: isSet(object.objectIndex) ? Number(object.objectIndex) : 0,
    };
  },

  toJSON(message: ObjectID): unknown {
    const obj: any = {};
    message.unsignedIntegerValue !== undefined && (obj.unsignedIntegerValue = Math.round(message.unsignedIntegerValue));
    message.stringValue !== undefined && (obj.stringValue = message.stringValue);
    message.objectIndex !== undefined && (obj.objectIndex = Math.round(message.objectIndex));
    return obj;
  },

  create<I extends Exact<DeepPartial<ObjectID>, I>>(base?: I): ObjectID {
    return ObjectID.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<ObjectID>, I>>(object: I): ObjectID {
    const message = createBaseObjectID();
    message.unsignedIntegerValue = object.unsignedIntegerValue ?? 0;
    message.stringValue = object.stringValue ?? "";
    message.objectIndex = object.objectIndex ?? 0;
    return message;
  },
};

function createBaseRegisterLatest(): RegisterLatest {
  return { contents: undefined };
}

export const RegisterLatest = {
  encode(message: RegisterLatest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.contents !== undefined) {
      ObjectID.encode(message.contents, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RegisterLatest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegisterLatest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          if (tag !== 18) {
            break;
          }

          message.contents = ObjectID.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): RegisterLatest {
    return { contents: isSet(object.contents) ? ObjectID.fromJSON(object.contents) : undefined };
  },

  toJSON(message: RegisterLatest): unknown {
    const obj: any = {};
    message.contents !== undefined && (obj.contents = message.contents ? ObjectID.toJSON(message.contents) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<RegisterLatest>, I>>(base?: I): RegisterLatest {
    return RegisterLatest.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<RegisterLatest>, I>>(object: I): RegisterLatest {
    const message = createBaseRegisterLatest();
    message.contents = (object.contents !== undefined && object.contents !== null)
      ? ObjectID.fromPartial(object.contents)
      : undefined;
    return message;
  },
};

function createBaseMapEntry(): MapEntry {
  return { key: 0, value: undefined };
}

export const MapEntry = {
  encode(message: MapEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== 0) {
      writer.uint32(8).int32(message.key);
    }
    if (message.value !== undefined) {
      ObjectID.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MapEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMapEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.key = reader.int32();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.value = ObjectID.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MapEntry {
    return {
      key: isSet(object.key) ? Number(object.key) : 0,
      value: isSet(object.value) ? ObjectID.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: MapEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = Math.round(message.key));
    message.value !== undefined && (obj.value = message.value ? ObjectID.toJSON(message.value) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<MapEntry>, I>>(base?: I): MapEntry {
    return MapEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<MapEntry>, I>>(object: I): MapEntry {
    const message = createBaseMapEntry();
    message.key = object.key ?? 0;
    message.value = (object.value !== undefined && object.value !== null)
      ? ObjectID.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseAttributeRun(): AttributeRun {
  return {
    length: 0,
    paragraphStyle: undefined,
    font: undefined,
    fontWeight: 0,
    underlined: 0,
    strikethrough: 0,
    superscript: 0,
    link: "",
    color: undefined,
    attachmentInfo: undefined,
  };
}

export const AttributeRun = {
  encode(message: AttributeRun, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.length !== 0) {
      writer.uint32(8).int32(message.length);
    }
    if (message.paragraphStyle !== undefined) {
      ParagraphStyle.encode(message.paragraphStyle, writer.uint32(18).fork()).ldelim();
    }
    if (message.font !== undefined) {
      Font.encode(message.font, writer.uint32(26).fork()).ldelim();
    }
    if (message.fontWeight !== 0) {
      writer.uint32(40).int32(message.fontWeight);
    }
    if (message.underlined !== 0) {
      writer.uint32(48).int32(message.underlined);
    }
    if (message.strikethrough !== 0) {
      writer.uint32(56).int32(message.strikethrough);
    }
    if (message.superscript !== 0) {
      writer.uint32(64).int32(message.superscript);
    }
    if (message.link !== "") {
      writer.uint32(74).string(message.link);
    }
    if (message.color !== undefined) {
      Color.encode(message.color, writer.uint32(82).fork()).ldelim();
    }
    if (message.attachmentInfo !== undefined) {
      AttachmentInfo.encode(message.attachmentInfo, writer.uint32(98).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AttributeRun {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAttributeRun();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.length = reader.int32();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.paragraphStyle = ParagraphStyle.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.font = Font.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.fontWeight = reader.int32();
          continue;
        case 6:
          if (tag !== 48) {
            break;
          }

          message.underlined = reader.int32();
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.strikethrough = reader.int32();
          continue;
        case 8:
          if (tag !== 64) {
            break;
          }

          message.superscript = reader.int32();
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.link = reader.string();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.color = Color.decode(reader, reader.uint32());
          continue;
        case 12:
          if (tag !== 98) {
            break;
          }

          message.attachmentInfo = AttachmentInfo.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AttributeRun {
    return {
      length: isSet(object.length) ? Number(object.length) : 0,
      paragraphStyle: isSet(object.paragraphStyle) ? ParagraphStyle.fromJSON(object.paragraphStyle) : undefined,
      font: isSet(object.font) ? Font.fromJSON(object.font) : undefined,
      fontWeight: isSet(object.fontWeight) ? Number(object.fontWeight) : 0,
      underlined: isSet(object.underlined) ? Number(object.underlined) : 0,
      strikethrough: isSet(object.strikethrough) ? Number(object.strikethrough) : 0,
      superscript: isSet(object.superscript) ? Number(object.superscript) : 0,
      link: isSet(object.link) ? String(object.link) : "",
      color: isSet(object.color) ? Color.fromJSON(object.color) : undefined,
      attachmentInfo: isSet(object.attachmentInfo) ? AttachmentInfo.fromJSON(object.attachmentInfo) : undefined,
    };
  },

  toJSON(message: AttributeRun): unknown {
    const obj: any = {};
    message.length !== undefined && (obj.length = Math.round(message.length));
    message.paragraphStyle !== undefined &&
      (obj.paragraphStyle = message.paragraphStyle ? ParagraphStyle.toJSON(message.paragraphStyle) : undefined);
    message.font !== undefined && (obj.font = message.font ? Font.toJSON(message.font) : undefined);
    message.fontWeight !== undefined && (obj.fontWeight = Math.round(message.fontWeight));
    message.underlined !== undefined && (obj.underlined = Math.round(message.underlined));
    message.strikethrough !== undefined && (obj.strikethrough = Math.round(message.strikethrough));
    message.superscript !== undefined && (obj.superscript = Math.round(message.superscript));
    message.link !== undefined && (obj.link = message.link);
    message.color !== undefined && (obj.color = message.color ? Color.toJSON(message.color) : undefined);
    message.attachmentInfo !== undefined &&
      (obj.attachmentInfo = message.attachmentInfo ? AttachmentInfo.toJSON(message.attachmentInfo) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<AttributeRun>, I>>(base?: I): AttributeRun {
    return AttributeRun.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<AttributeRun>, I>>(object: I): AttributeRun {
    const message = createBaseAttributeRun();
    message.length = object.length ?? 0;
    message.paragraphStyle = (object.paragraphStyle !== undefined && object.paragraphStyle !== null)
      ? ParagraphStyle.fromPartial(object.paragraphStyle)
      : undefined;
    message.font = (object.font !== undefined && object.font !== null) ? Font.fromPartial(object.font) : undefined;
    message.fontWeight = object.fontWeight ?? 0;
    message.underlined = object.underlined ?? 0;
    message.strikethrough = object.strikethrough ?? 0;
    message.superscript = object.superscript ?? 0;
    message.link = object.link ?? "";
    message.color = (object.color !== undefined && object.color !== null) ? Color.fromPartial(object.color) : undefined;
    message.attachmentInfo = (object.attachmentInfo !== undefined && object.attachmentInfo !== null)
      ? AttachmentInfo.fromPartial(object.attachmentInfo)
      : undefined;
    return message;
  },
};

function createBaseNoteStoreProto(): NoteStoreProto {
  return { document: undefined };
}

export const NoteStoreProto = {
  encode(message: NoteStoreProto, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.document !== undefined) {
      Document.encode(message.document, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): NoteStoreProto {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNoteStoreProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          if (tag !== 18) {
            break;
          }

          message.document = Document.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): NoteStoreProto {
    return { document: isSet(object.document) ? Document.fromJSON(object.document) : undefined };
  },

  toJSON(message: NoteStoreProto): unknown {
    const obj: any = {};
    message.document !== undefined && (obj.document = message.document ? Document.toJSON(message.document) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<NoteStoreProto>, I>>(base?: I): NoteStoreProto {
    return NoteStoreProto.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<NoteStoreProto>, I>>(object: I): NoteStoreProto {
    const message = createBaseNoteStoreProto();
    message.document = (object.document !== undefined && object.document !== null)
      ? Document.fromPartial(object.document)
      : undefined;
    return message;
  },
};

function createBaseDocument(): Document {
  return { version: 0, note: undefined };
}

export const Document = {
  encode(message: Document, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.version !== 0) {
      writer.uint32(16).int32(message.version);
    }
    if (message.note !== undefined) {
      Note.encode(message.note, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Document {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDocument();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          if (tag !== 16) {
            break;
          }

          message.version = reader.int32();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.note = Note.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Document {
    return {
      version: isSet(object.version) ? Number(object.version) : 0,
      note: isSet(object.note) ? Note.fromJSON(object.note) : undefined,
    };
  },

  toJSON(message: Document): unknown {
    const obj: any = {};
    message.version !== undefined && (obj.version = Math.round(message.version));
    message.note !== undefined && (obj.note = message.note ? Note.toJSON(message.note) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<Document>, I>>(base?: I): Document {
    return Document.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Document>, I>>(object: I): Document {
    const message = createBaseDocument();
    message.version = object.version ?? 0;
    message.note = (object.note !== undefined && object.note !== null) ? Note.fromPartial(object.note) : undefined;
    return message;
  },
};

function createBaseNote(): Note {
  return { noteText: "", attributeRun: [] };
}

export const Note = {
  encode(message: Note, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.noteText !== "") {
      writer.uint32(18).string(message.noteText);
    }
    for (const v of message.attributeRun) {
      AttributeRun.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Note {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNote();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          if (tag !== 18) {
            break;
          }

          message.noteText = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.attributeRun.push(AttributeRun.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Note {
    return {
      noteText: isSet(object.noteText) ? String(object.noteText) : "",
      attributeRun: Array.isArray(object?.attributeRun)
        ? object.attributeRun.map((e: any) => AttributeRun.fromJSON(e))
        : [],
    };
  },

  toJSON(message: Note): unknown {
    const obj: any = {};
    message.noteText !== undefined && (obj.noteText = message.noteText);
    if (message.attributeRun) {
      obj.attributeRun = message.attributeRun.map((e) => e ? AttributeRun.toJSON(e) : undefined);
    } else {
      obj.attributeRun = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Note>, I>>(base?: I): Note {
    return Note.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<Note>, I>>(object: I): Note {
    const message = createBaseNote();
    message.noteText = object.noteText ?? "";
    message.attributeRun = object.attributeRun?.map((e) => AttributeRun.fromPartial(e)) || [];
    return message;
  },
};

function createBaseMergableDataProto(): MergableDataProto {
  return { mergableDataObject: undefined };
}

export const MergableDataProto = {
  encode(message: MergableDataProto, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.mergableDataObject !== undefined) {
      MergableDataObject.encode(message.mergableDataObject, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MergableDataProto {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMergableDataProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          if (tag !== 18) {
            break;
          }

          message.mergableDataObject = MergableDataObject.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MergableDataProto {
    return {
      mergableDataObject: isSet(object.mergableDataObject)
        ? MergableDataObject.fromJSON(object.mergableDataObject)
        : undefined,
    };
  },

  toJSON(message: MergableDataProto): unknown {
    const obj: any = {};
    message.mergableDataObject !== undefined && (obj.mergableDataObject = message.mergableDataObject
      ? MergableDataObject.toJSON(message.mergableDataObject)
      : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<MergableDataProto>, I>>(base?: I): MergableDataProto {
    return MergableDataProto.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<MergableDataProto>, I>>(object: I): MergableDataProto {
    const message = createBaseMergableDataProto();
    message.mergableDataObject = (object.mergableDataObject !== undefined && object.mergableDataObject !== null)
      ? MergableDataObject.fromPartial(object.mergableDataObject)
      : undefined;
    return message;
  },
};

function createBaseMergableDataObject(): MergableDataObject {
  return { version: 0, mergeableDataObjectData: undefined };
}

export const MergableDataObject = {
  encode(message: MergableDataObject, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.version !== 0) {
      writer.uint32(16).int32(message.version);
    }
    if (message.mergeableDataObjectData !== undefined) {
      MergeableDataObjectData.encode(message.mergeableDataObjectData, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MergableDataObject {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMergableDataObject();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          if (tag !== 16) {
            break;
          }

          message.version = reader.int32();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.mergeableDataObjectData = MergeableDataObjectData.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MergableDataObject {
    return {
      version: isSet(object.version) ? Number(object.version) : 0,
      mergeableDataObjectData: isSet(object.mergeableDataObjectData)
        ? MergeableDataObjectData.fromJSON(object.mergeableDataObjectData)
        : undefined,
    };
  },

  toJSON(message: MergableDataObject): unknown {
    const obj: any = {};
    message.version !== undefined && (obj.version = Math.round(message.version));
    message.mergeableDataObjectData !== undefined && (obj.mergeableDataObjectData = message.mergeableDataObjectData
      ? MergeableDataObjectData.toJSON(message.mergeableDataObjectData)
      : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<MergableDataObject>, I>>(base?: I): MergableDataObject {
    return MergableDataObject.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<MergableDataObject>, I>>(object: I): MergableDataObject {
    const message = createBaseMergableDataObject();
    message.version = object.version ?? 0;
    message.mergeableDataObjectData =
      (object.mergeableDataObjectData !== undefined && object.mergeableDataObjectData !== null)
        ? MergeableDataObjectData.fromPartial(object.mergeableDataObjectData)
        : undefined;
    return message;
  },
};

function createBaseMergeableDataObjectData(): MergeableDataObjectData {
  return {
    mergeableDataObjectEntry: [],
    mergeableDataObjectKeyItem: [],
    mergeableDataObjectTypeItem: [],
    mergeableDataObjectUuidItem: [],
  };
}

export const MergeableDataObjectData = {
  encode(message: MergeableDataObjectData, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.mergeableDataObjectEntry) {
      MergeableDataObjectEntry.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.mergeableDataObjectKeyItem) {
      writer.uint32(34).string(v!);
    }
    for (const v of message.mergeableDataObjectTypeItem) {
      writer.uint32(42).string(v!);
    }
    for (const v of message.mergeableDataObjectUuidItem) {
      writer.uint32(50).bytes(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MergeableDataObjectData {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMergeableDataObjectData();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 3:
          if (tag !== 26) {
            break;
          }

          message.mergeableDataObjectEntry.push(MergeableDataObjectEntry.decode(reader, reader.uint32()));
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.mergeableDataObjectKeyItem.push(reader.string());
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.mergeableDataObjectTypeItem.push(reader.string());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.mergeableDataObjectUuidItem.push(reader.bytes());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MergeableDataObjectData {
    return {
      mergeableDataObjectEntry: Array.isArray(object?.mergeableDataObjectEntry)
        ? object.mergeableDataObjectEntry.map((e: any) => MergeableDataObjectEntry.fromJSON(e))
        : [],
      mergeableDataObjectKeyItem: Array.isArray(object?.mergeableDataObjectKeyItem)
        ? object.mergeableDataObjectKeyItem.map((e: any) => String(e))
        : [],
      mergeableDataObjectTypeItem: Array.isArray(object?.mergeableDataObjectTypeItem)
        ? object.mergeableDataObjectTypeItem.map((e: any) => String(e))
        : [],
      mergeableDataObjectUuidItem: Array.isArray(object?.mergeableDataObjectUuidItem)
        ? object.mergeableDataObjectUuidItem.map((e: any) => bytesFromBase64(e))
        : [],
    };
  },

  toJSON(message: MergeableDataObjectData): unknown {
    const obj: any = {};
    if (message.mergeableDataObjectEntry) {
      obj.mergeableDataObjectEntry = message.mergeableDataObjectEntry.map((e) =>
        e ? MergeableDataObjectEntry.toJSON(e) : undefined
      );
    } else {
      obj.mergeableDataObjectEntry = [];
    }
    if (message.mergeableDataObjectKeyItem) {
      obj.mergeableDataObjectKeyItem = message.mergeableDataObjectKeyItem.map((e) => e);
    } else {
      obj.mergeableDataObjectKeyItem = [];
    }
    if (message.mergeableDataObjectTypeItem) {
      obj.mergeableDataObjectTypeItem = message.mergeableDataObjectTypeItem.map((e) => e);
    } else {
      obj.mergeableDataObjectTypeItem = [];
    }
    if (message.mergeableDataObjectUuidItem) {
      obj.mergeableDataObjectUuidItem = message.mergeableDataObjectUuidItem.map((e) =>
        base64FromBytes(e !== undefined ? e : new Uint8Array())
      );
    } else {
      obj.mergeableDataObjectUuidItem = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MergeableDataObjectData>, I>>(base?: I): MergeableDataObjectData {
    return MergeableDataObjectData.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<MergeableDataObjectData>, I>>(object: I): MergeableDataObjectData {
    const message = createBaseMergeableDataObjectData();
    message.mergeableDataObjectEntry =
      object.mergeableDataObjectEntry?.map((e) => MergeableDataObjectEntry.fromPartial(e)) || [];
    message.mergeableDataObjectKeyItem = object.mergeableDataObjectKeyItem?.map((e) => e) || [];
    message.mergeableDataObjectTypeItem = object.mergeableDataObjectTypeItem?.map((e) => e) || [];
    message.mergeableDataObjectUuidItem = object.mergeableDataObjectUuidItem?.map((e) => e) || [];
    return message;
  },
};

function createBaseMergeableDataObjectEntry(): MergeableDataObjectEntry {
  return {
    registerLatest: undefined,
    dictionary: undefined,
    note: undefined,
    customMap: undefined,
    orderedSet: undefined,
  };
}

export const MergeableDataObjectEntry = {
  encode(message: MergeableDataObjectEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.registerLatest !== undefined) {
      RegisterLatest.encode(message.registerLatest, writer.uint32(10).fork()).ldelim();
    }
    if (message.dictionary !== undefined) {
      Dictionary.encode(message.dictionary, writer.uint32(50).fork()).ldelim();
    }
    if (message.note !== undefined) {
      Note.encode(message.note, writer.uint32(82).fork()).ldelim();
    }
    if (message.customMap !== undefined) {
      MergeableDataObjectMap.encode(message.customMap, writer.uint32(106).fork()).ldelim();
    }
    if (message.orderedSet !== undefined) {
      OrderedSet.encode(message.orderedSet, writer.uint32(130).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MergeableDataObjectEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMergeableDataObjectEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.registerLatest = RegisterLatest.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.dictionary = Dictionary.decode(reader, reader.uint32());
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.note = Note.decode(reader, reader.uint32());
          continue;
        case 13:
          if (tag !== 106) {
            break;
          }

          message.customMap = MergeableDataObjectMap.decode(reader, reader.uint32());
          continue;
        case 16:
          if (tag !== 130) {
            break;
          }

          message.orderedSet = OrderedSet.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MergeableDataObjectEntry {
    return {
      registerLatest: isSet(object.registerLatest) ? RegisterLatest.fromJSON(object.registerLatest) : undefined,
      dictionary: isSet(object.dictionary) ? Dictionary.fromJSON(object.dictionary) : undefined,
      note: isSet(object.note) ? Note.fromJSON(object.note) : undefined,
      customMap: isSet(object.customMap) ? MergeableDataObjectMap.fromJSON(object.customMap) : undefined,
      orderedSet: isSet(object.orderedSet) ? OrderedSet.fromJSON(object.orderedSet) : undefined,
    };
  },

  toJSON(message: MergeableDataObjectEntry): unknown {
    const obj: any = {};
    message.registerLatest !== undefined &&
      (obj.registerLatest = message.registerLatest ? RegisterLatest.toJSON(message.registerLatest) : undefined);
    message.dictionary !== undefined &&
      (obj.dictionary = message.dictionary ? Dictionary.toJSON(message.dictionary) : undefined);
    message.note !== undefined && (obj.note = message.note ? Note.toJSON(message.note) : undefined);
    message.customMap !== undefined &&
      (obj.customMap = message.customMap ? MergeableDataObjectMap.toJSON(message.customMap) : undefined);
    message.orderedSet !== undefined &&
      (obj.orderedSet = message.orderedSet ? OrderedSet.toJSON(message.orderedSet) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<MergeableDataObjectEntry>, I>>(base?: I): MergeableDataObjectEntry {
    return MergeableDataObjectEntry.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<MergeableDataObjectEntry>, I>>(object: I): MergeableDataObjectEntry {
    const message = createBaseMergeableDataObjectEntry();
    message.registerLatest = (object.registerLatest !== undefined && object.registerLatest !== null)
      ? RegisterLatest.fromPartial(object.registerLatest)
      : undefined;
    message.dictionary = (object.dictionary !== undefined && object.dictionary !== null)
      ? Dictionary.fromPartial(object.dictionary)
      : undefined;
    message.note = (object.note !== undefined && object.note !== null) ? Note.fromPartial(object.note) : undefined;
    message.customMap = (object.customMap !== undefined && object.customMap !== null)
      ? MergeableDataObjectMap.fromPartial(object.customMap)
      : undefined;
    message.orderedSet = (object.orderedSet !== undefined && object.orderedSet !== null)
      ? OrderedSet.fromPartial(object.orderedSet)
      : undefined;
    return message;
  },
};

function createBaseMergeableDataObjectMap(): MergeableDataObjectMap {
  return { type: 0, mapEntry: [] };
}

export const MergeableDataObjectMap = {
  encode(message: MergeableDataObjectMap, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.type !== 0) {
      writer.uint32(8).int32(message.type);
    }
    for (const v of message.mapEntry) {
      MapEntry.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MergeableDataObjectMap {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMergeableDataObjectMap();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.type = reader.int32();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.mapEntry.push(MapEntry.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MergeableDataObjectMap {
    return {
      type: isSet(object.type) ? Number(object.type) : 0,
      mapEntry: Array.isArray(object?.mapEntry) ? object.mapEntry.map((e: any) => MapEntry.fromJSON(e)) : [],
    };
  },

  toJSON(message: MergeableDataObjectMap): unknown {
    const obj: any = {};
    message.type !== undefined && (obj.type = Math.round(message.type));
    if (message.mapEntry) {
      obj.mapEntry = message.mapEntry.map((e) => e ? MapEntry.toJSON(e) : undefined);
    } else {
      obj.mapEntry = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<MergeableDataObjectMap>, I>>(base?: I): MergeableDataObjectMap {
    return MergeableDataObjectMap.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<MergeableDataObjectMap>, I>>(object: I): MergeableDataObjectMap {
    const message = createBaseMergeableDataObjectMap();
    message.type = object.type ?? 0;
    message.mapEntry = object.mapEntry?.map((e) => MapEntry.fromPartial(e)) || [];
    return message;
  },
};

function createBaseOrderedSet(): OrderedSet {
  return { ordering: undefined, elements: undefined };
}

export const OrderedSet = {
  encode(message: OrderedSet, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.ordering !== undefined) {
      OrderedSetOrdering.encode(message.ordering, writer.uint32(10).fork()).ldelim();
    }
    if (message.elements !== undefined) {
      Dictionary.encode(message.elements, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): OrderedSet {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOrderedSet();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.ordering = OrderedSetOrdering.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.elements = Dictionary.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): OrderedSet {
    return {
      ordering: isSet(object.ordering) ? OrderedSetOrdering.fromJSON(object.ordering) : undefined,
      elements: isSet(object.elements) ? Dictionary.fromJSON(object.elements) : undefined,
    };
  },

  toJSON(message: OrderedSet): unknown {
    const obj: any = {};
    message.ordering !== undefined &&
      (obj.ordering = message.ordering ? OrderedSetOrdering.toJSON(message.ordering) : undefined);
    message.elements !== undefined &&
      (obj.elements = message.elements ? Dictionary.toJSON(message.elements) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<OrderedSet>, I>>(base?: I): OrderedSet {
    return OrderedSet.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<OrderedSet>, I>>(object: I): OrderedSet {
    const message = createBaseOrderedSet();
    message.ordering = (object.ordering !== undefined && object.ordering !== null)
      ? OrderedSetOrdering.fromPartial(object.ordering)
      : undefined;
    message.elements = (object.elements !== undefined && object.elements !== null)
      ? Dictionary.fromPartial(object.elements)
      : undefined;
    return message;
  },
};

function createBaseOrderedSetOrdering(): OrderedSetOrdering {
  return { array: undefined, contents: undefined };
}

export const OrderedSetOrdering = {
  encode(message: OrderedSetOrdering, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.array !== undefined) {
      OrderedSetOrderingArray.encode(message.array, writer.uint32(10).fork()).ldelim();
    }
    if (message.contents !== undefined) {
      Dictionary.encode(message.contents, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): OrderedSetOrdering {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOrderedSetOrdering();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.array = OrderedSetOrderingArray.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.contents = Dictionary.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): OrderedSetOrdering {
    return {
      array: isSet(object.array) ? OrderedSetOrderingArray.fromJSON(object.array) : undefined,
      contents: isSet(object.contents) ? Dictionary.fromJSON(object.contents) : undefined,
    };
  },

  toJSON(message: OrderedSetOrdering): unknown {
    const obj: any = {};
    message.array !== undefined &&
      (obj.array = message.array ? OrderedSetOrderingArray.toJSON(message.array) : undefined);
    message.contents !== undefined &&
      (obj.contents = message.contents ? Dictionary.toJSON(message.contents) : undefined);
    return obj;
  },

  create<I extends Exact<DeepPartial<OrderedSetOrdering>, I>>(base?: I): OrderedSetOrdering {
    return OrderedSetOrdering.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<OrderedSetOrdering>, I>>(object: I): OrderedSetOrdering {
    const message = createBaseOrderedSetOrdering();
    message.array = (object.array !== undefined && object.array !== null)
      ? OrderedSetOrderingArray.fromPartial(object.array)
      : undefined;
    message.contents = (object.contents !== undefined && object.contents !== null)
      ? Dictionary.fromPartial(object.contents)
      : undefined;
    return message;
  },
};

function createBaseOrderedSetOrderingArray(): OrderedSetOrderingArray {
  return { contents: undefined, attachment: [] };
}

export const OrderedSetOrderingArray = {
  encode(message: OrderedSetOrderingArray, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.contents !== undefined) {
      Note.encode(message.contents, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.attachment) {
      OrderedSetOrderingArrayAttachment.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): OrderedSetOrderingArray {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOrderedSetOrderingArray();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.contents = Note.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.attachment.push(OrderedSetOrderingArrayAttachment.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): OrderedSetOrderingArray {
    return {
      contents: isSet(object.contents) ? Note.fromJSON(object.contents) : undefined,
      attachment: Array.isArray(object?.attachment)
        ? object.attachment.map((e: any) => OrderedSetOrderingArrayAttachment.fromJSON(e))
        : [],
    };
  },

  toJSON(message: OrderedSetOrderingArray): unknown {
    const obj: any = {};
    message.contents !== undefined && (obj.contents = message.contents ? Note.toJSON(message.contents) : undefined);
    if (message.attachment) {
      obj.attachment = message.attachment.map((e) => e ? OrderedSetOrderingArrayAttachment.toJSON(e) : undefined);
    } else {
      obj.attachment = [];
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<OrderedSetOrderingArray>, I>>(base?: I): OrderedSetOrderingArray {
    return OrderedSetOrderingArray.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<OrderedSetOrderingArray>, I>>(object: I): OrderedSetOrderingArray {
    const message = createBaseOrderedSetOrderingArray();
    message.contents = (object.contents !== undefined && object.contents !== null)
      ? Note.fromPartial(object.contents)
      : undefined;
    message.attachment = object.attachment?.map((e) => OrderedSetOrderingArrayAttachment.fromPartial(e)) || [];
    return message;
  },
};

function createBaseOrderedSetOrderingArrayAttachment(): OrderedSetOrderingArrayAttachment {
  return { index: 0, uuid: new Uint8Array() };
}

export const OrderedSetOrderingArrayAttachment = {
  encode(message: OrderedSetOrderingArrayAttachment, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.index !== 0) {
      writer.uint32(8).int32(message.index);
    }
    if (message.uuid.length !== 0) {
      writer.uint32(18).bytes(message.uuid);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): OrderedSetOrderingArrayAttachment {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOrderedSetOrderingArrayAttachment();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.index = reader.int32();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.uuid = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): OrderedSetOrderingArrayAttachment {
    return {
      index: isSet(object.index) ? Number(object.index) : 0,
      uuid: isSet(object.uuid) ? bytesFromBase64(object.uuid) : new Uint8Array(),
    };
  },

  toJSON(message: OrderedSetOrderingArrayAttachment): unknown {
    const obj: any = {};
    message.index !== undefined && (obj.index = Math.round(message.index));
    message.uuid !== undefined &&
      (obj.uuid = base64FromBytes(message.uuid !== undefined ? message.uuid : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<OrderedSetOrderingArrayAttachment>, I>>(
    base?: I,
  ): OrderedSetOrderingArrayAttachment {
    return OrderedSetOrderingArrayAttachment.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<OrderedSetOrderingArrayAttachment>, I>>(
    object: I,
  ): OrderedSetOrderingArrayAttachment {
    const message = createBaseOrderedSetOrderingArrayAttachment();
    message.index = object.index ?? 0;
    message.uuid = object.uuid ?? new Uint8Array();
    return message;
  },
};

declare var self: any | undefined;
declare var window: any | undefined;
declare var global: any | undefined;
var tsProtoGlobalThis: any = (() => {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw "Unable to locate global object";
})();

function bytesFromBase64(b64: string): Uint8Array {
  if (tsProtoGlobalThis.Buffer) {
    return Uint8Array.from(tsProtoGlobalThis.Buffer.from(b64, "base64"));
  } else {
    const bin = tsProtoGlobalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if (tsProtoGlobalThis.Buffer) {
    return tsProtoGlobalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(String.fromCharCode(byte));
    });
    return tsProtoGlobalThis.btoa(bin.join(""));
  }
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function longToNumber(long: Long): number {
  if (long.gt(Number.MAX_SAFE_INTEGER)) {
    throw new tsProtoGlobalThis.Error("Value is larger than Number.MAX_SAFE_INTEGER");
  }
  return long.toNumber();
}

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
// @ts-ignore
if (_m0.util.Long !== Long) { 
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
