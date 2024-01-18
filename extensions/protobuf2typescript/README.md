# Protobuf2TypeScript

A Raycast script which help front-end devloper to convert *.protobuf file into *.d.ts file.

## Screenshots

![protobuf2typescript-1](https://github.com/7gugu/protobuf2typescript/assets/8674852/1bbdbb94-6fef-4a92-9a81-c445ff65358e)
![protobuf2typescript-2](https://github.com/7gugu/protobuf2typescript/assets/8674852/524b5313-c460-4f77-aa9b-fe4671eda62c)
![protobuf2typescript-3](https://github.com/7gugu/protobuf2typescript/assets/8674852/3f6a56b0-a4fb-46eb-a3ac-2b1a885c4be2)

## Example

Convert this:

```proto
message Person {
  string name = 1;
  int32 id = 2;
  bool isFriend = 3;
  repeated PhoneNumber phones = 4;
}

message PhoneNumber {
  string number = 1;
  PhoneType type = 2;
}

message AddressBook {
  repeated Person people = 1;
}
```

into this:

```typescript
interface Person {
  name: string;
  id: number;
  isFriend: boolean;
  phones: PhoneNumber[];
}

interface PhoneNumber {
  number: string;
  type: PhoneType;
}

interface AddressBook {
  people: Person[];
}
```

## Idea From

- [protobuf-to-typescript ](https://github.com/geotho/protobuf-to-typescript/tree/master)
