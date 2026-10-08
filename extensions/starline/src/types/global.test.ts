describe("global type declarations", () => {
    it("preserves runtime behavior of standard library methods", () => {
        expect(Object.keys({ a: 1 })).toEqual(["a"]);
        expect(JSON.parse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    });
});
