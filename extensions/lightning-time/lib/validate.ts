const validate = (lightningString: string) => /([\da-f]~){2}[\da-f](\|[\da-f]+|)$/g.test(lightningString);

export default validate;
