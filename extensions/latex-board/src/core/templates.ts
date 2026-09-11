import accents from "../../assets/equation_templates/accents.json";
import brackets from "../../assets/equation_templates/brackets.json";
import complexNumbers from "../../assets/equation_templates/complex_numbers.json";
import derivatives from "../../assets/equation_templates/derivatives.json";
import displayFormats from "../../assets/equation_templates/display_formats.json";
import fontsSizes from "../../assets/equation_templates/fonts_sizes.json";
import fractions from "../../assets/equation_templates/fractions.json";
import greekLowercase from "../../assets/equation_templates/greek_lowercase.json";
import greekUppercase from "../../assets/equation_templates/greek_uppercase.json";
import integrals from "../../assets/equation_templates/integrals.json";
import limits from "../../assets/equation_templates/limits.json";
import logic from "../../assets/equation_templates/logic.json";
import matrices from "../../assets/equation_templates/matrices.json";
import operators from "../../assets/equation_templates/operators.json";
import permutationsCombinations from "../../assets/equation_templates/permutations_combinations.json";
import powersExponentsLogarithms from "../../assets/equation_templates/powers_exponents_logarithms.json";
import sets from "../../assets/equation_templates/sets.json";
import spacing from "../../assets/equation_templates/spacing.json";
import specialCharacters from "../../assets/equation_templates/special_characters.json";
import summationProduct from "../../assets/equation_templates/summation_product.json";
import trigonometry from "../../assets/equation_templates/trigonometry.json";
import vectors from "../../assets/equation_templates/vectors.json";

type EquationTemplatesObj = Record<string, Record<string, string>>;

export const templates: EquationTemplatesObj = {
  // Basic structures
  ...fractions,
  ...powersExponentsLogarithms,
  ...brackets,

  // Calculus
  ...summationProduct,
  ...limits,
  ...derivatives,
  ...integrals,

  // Functions
  ...trigonometry,

  // Linear algebra
  ...vectors,
  ...matrices,

  // Other math
  ...sets,
  ...logic,
  ...complexNumbers,
  ...permutationsCombinations,

  // Formatting & styling
  ...accents,
  ...displayFormats,
  ...fontsSizes,
  ...spacing,
  ...specialCharacters,

  // Basic symbols
  ...operators,

  // Greek letters
  ...greekLowercase,
  ...greekUppercase,
};
