/* tslint:disable */
/* eslint-disable */
/**
 * Converts a JSON value of SVGO's `Config["plugins"]` into [`Jobs`].
 *
 * Note that this will deduplicate any plugins listed.
 *
 * # Errors
 *
 * If a config file cannot be deserialized into jobs. This may fail even if
 * the config is valid for SVGO, such as if
 *
 * - The config contains custom plugins
 * - The plugin parameters are incompatible with OXVG
 * - The underlying deserialization process fails
 *
 * If you believe an errors should be fixed, please raise an issue
 * [here](https://github.com/noahbald/oxvg/issues)
 */
export function convertSvgoConfig(config?: any[] | null): Jobs;
/**
 * Optimise an SVG document using the provided config
 *
 * # Errors
 * - If the document fails to parse
 * - If any of the optimisations fail
 * - If the optimised document fails to serialize
 *
 * # Examples
 *
 * Optimise svg with the default configuration
 *
 * ```js
 * import { optimise } from "@oxvg/wasm";
 *
 * const result = optimise(`<svg />`);
 * ```
 *
 * Or, provide your own config
 *
 * ```js
 * import { optimise } from "@oxvg/wasm";
 *
 * // Only optimise path data
 * const result = optimise(`<svg />`, { convertPathData: {} });
 * ```
 *
 * Or, extend a preset
 *
 * ```js
 * import { optimise, extend } from "@oxvg/wasm";
 *
 * const result = optimise(
 *     `<svg />`,
 *     extend("default", { convertPathData: { removeUseless: false } }),
 * );
 * ```
 */
export function optimise(svg: string, config?: Jobs | null): string;
/**
 * Returns the given config with omitted options replaced with the config provided by `extends`.
 * I.e. acts like `{ ...extends, ...config }`
 */
export function extend(_extends: Extends, config?: Jobs | null): Jobs;
/**
 * Replaces `xlink` prefixed attributes to the native SVG equivalent.
 *
 * # Correctness
 *
 * This job may break compatibility with the SVG 1.1 spec.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface RemoveXlink {
    /**
     * Whether to also convert xlink attributes for legacy elements which don\'t
     * support the SVG 2 `href` attribute (e.g. `<cursor>`).
     *
     * This is safe to enable for SVGs to inline in HTML documents.
     */
    include_legacy?: boolean;
}

/**
 * Removes unreferenced `<defs>` elements
 *
 * # Differences to SVGO
 *
 * Defs with a class attribute will be retained, as only useful ones should remain
 * after running `inline_styles`.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveUselessDefs = boolean;

/**
 * Converts basic shapes to `<path>` elements
 *
 * # Differences to SVGO
 *
 * OXVG will avoid converting shapes which may be referenced by local-name
 * in stylesheets.
 *
 * # Correctness
 *
 * Rounding errors may cause slight changes in visual appearance.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface ConvertShapeToPath {
    /**
     * Whether to convert `<circle>` and `<ellipses>` to paths.
     */
    convertArcs?: boolean;
    /**
     * The number of decimal places to round to
     */
    floatPrecision?: null | false | number;
}

/**
 * Removes deprecated attributes from elements.
 *
 * # Correctnesss
 *
 * By default this job should never visually change the document.
 *
 * Specifying `remove_unsafe` may remove attributes which visually change
 * the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface RemoveDeprecatedAttrs {
    /**
     * Whether to remove deprecated presentation attributes
     */
    removeUnsafe?: boolean;
}

/**
 * Removes all xml namespaces associated with editing software.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * Editor namespaces may be used by the editor and contain data that might be
 * lost if you try to edit the file after optimising.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface RemoveEditorsNSData {
    /**
     * A list of additional namespaces URIs you may want to remove.
     */
    additionalNamespaces?: string[];
}

/**
 * For SVGs with a `viewBox` attribute, removes `<path>` element outside of it\'s bounds.
 *
 * Elements with `transform` are ignored, as they may be affected by animations.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveOffCanvasPaths = boolean;

/**
 * Cleans up `enable-background` attributes and styles. It will only remove it if
 * - The document has no `<filter>` element; and
 * - The value matches the document\'s width and height; or
 * - Replace `new` when it matches the width and height of a `<mask>` or `<pattern>`
 *
 * This job will:
 * - Drop `enable-background` on `<svg>` node, if it matches the node\'s width and height
 * - Set `enable-background` to `\"new\"` on `<mask>` or `<pattern>` nodes, if it matches the
 *   node\'s width and height
 *
 * # Correctness
 *
 * This attribute is deprecated and won\'t visually affect documents in most renderers. For outdated
 * renderers that still support it, there may be a visual change.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type CleanupEnableBackground = boolean;

/**
 * A preset which the specified jobs can overwrite
 */
export type Extends = "none" | "default" | "safe";

/**
 * Removes unused ids and minifies used ids.
 *
 * # Differences to SVGO
 *
 * The generated ids may be different to those produced by SVGO
 *
 * # Correctness
 *
 * By default documents with scripts or style elements are skipped, so the ids aren\'t selected
 * and can\'t affect the document\'s appearance or behaviour.
 *
 * When inlined there\'s a good chance that existing id selectors will no longer match the ids.
 * Additionally, when inlining multiple SVGs it\'s likely ids will overlap.
 *
 * You can choose to disable `minify` or use the `prefixIds` job to help with workarounds.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface CleanupIds {
    /**
     * Whether to remove unreferenced ids.
     */
    remove?: boolean;
    /**
     * Whether to minify ids
     */
    minify?: boolean;
    /**
     * Skips ids that match an item in the list
     */
    preserve?: string[];
    /**
     * Skips ids that start with a string matching a prefix in the list
     */
    preservePrefixes?: string[];
    /**
     * Whether to run despite `<script>` or `<style>`
     */
    force?: boolean;
}

/**
 * Filters `<g>` elements that have no effect.
 *
 * For removing empty groups, see [`super::RemoveEmptyContainers`].
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type CollapseGroups = boolean;

/**
 * Merge transforms and convert to shortest form.
 *
 * # Correctness
 *
 * Rounding errors may cause slight changes in visual appearance.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface ConvertTransform {
    /**
     * Whether to convert transforms to their shorthand alternative.
     */
    convertToShorts?: boolean;
    /**
     * Number of decimal places to round degrees to, for `rotate` and `skew`.
     *
     * Some of the precision may also be lost during serialization.
     */
    degPrecision?: number | undefined;
    /**
     * Number of decimal places to round to, for `rotate`\'s origin and `translate`.
     */
    floatPrecision?: number;
    /**
     * Number of decimal places to round to, for `scale`.
     */
    transformPrecision?: number;
    /**
     * Whether to convert matrices into transforms.
     */
    matrixToTransform?: boolean;
    /**
     * Whether to remove redundant arguments from `translate` (e.g. `translate(10 0)` -> `transflate(10)`).
     */
    shortRotate?: boolean;
    /**
     * Whether to remove redundant transforms (e.g. `translate(0)`).
     */
    removeUseless?: boolean;
    /**
     * Whether to merge transforms.
     */
    collapseIntoOne?: boolean;
}

/**
 * Converts non-eccentric `<ellipse>` to `<circle>` elements.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type ConvertEllipseToCircle = boolean;

/**
 * Converts `linearGradient` and `radialGradient` nodes that are a solid colour
 * to the equivalent colour.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type ConvertOneStopGradients = boolean;

/**
 * Removes the `<desc>` element from the document when empty or only contains editor attribution.
 *
 * # Correctness
 *
 * By default this job should never functionally change the document.
 *
 * By using `remove_any` you may deteriotate the accessibility of the document for some users.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface RemoveDesc {
    /**
     * Whether to remove all `<desc>` elements
     */
    removeAny?: boolean;
}

/**
 * Remove attributes based on whether it matches a pattern.
 *
 * The patterns syntax is `[ element* : attribute* : value* ]`; where
 *
 * - A regular expression matching an element\'s name. An asterisk or omission matches all.
 * - A regular expression matching an attribute\'s name.
 * - A regular expression matching an attribute\'s value. An asterisk or omission matches all.
 *
 * # Example
 *
 * Match `fill` attribute in `<path>` elements
 *
 * ```
 * use oxvg_optimiser::{Jobs, RemoveAttrs};
 *
 * let mut remove_attrs = RemoveAttrs::default();
 * remove_attrs.attrs = vec![String::from(\"path:fill\")];
 * let jobs = Jobs {
 *   remove_attrs: Some(remove_attrs),
 *   ..Jobs::none()
 * };
 * ```
 * # Correctness
 *
 * Removing attributes may visually change the document if they\'re
 * presentation attributes or selected with CSS.
 *
 * # Errors
 *
 * If the regex fails to parse.
 */
export interface RemoveAttrs {
    /**
     * A list of patterns that match attributes.
     */
    attrs: string[];
    /**
     * The separator for different parts of the pattern. By default this is `\":\"`.
     *
     * You may need to use this if you need to match attributes with a `:` (i.e. prefixed attributes).
     */
    elemSeparator?: string;
    /**
     * Whether to ignore attributes set to `currentColor`
     */
    preserveCurrentColor?: boolean;
}

/**
 * Removes XML comments from the document.
 *
 * By default this job ignores comments starting with `<!--!` which is often used
 * for legal information, such as copyright, licensing, or attribution.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * Scripts which target comments, or conditional comments such as `<!--[if IE 8]>`
 * may be affected.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface RemoveComments {
    /**
     * A list of regex patters to match against comments, where matching comments will
     * not be removed from the document.
     */
    preservePatterns?: { regex: string };
}

/**
 * Each task for optimising an SVG document.
 */
export interface Jobs {
    /**
     *
     */
    precheck?: Precheck;
    /**
     *
     */
    addAttributesToSVGElement?: AddAttributesToSVGElement;
    /**
     *
     */
    addClassesToSVGElement?: AddClassesToSVGElement;
    /**
     *
     */
    cleanupListOfValues?: CleanupListOfValues;
    /**
     *
     */
    convertOneStopGradients?: ConvertOneStopGradients;
    /**
     *
     */
    convertStyleToAttrs?: ConvertStyleToAttrs;
    /**
     *
     */
    removeAttributesBySelector?: RemoveAttributesBySelector;
    /**
     *
     */
    removeAttrs?: RemoveAttrs;
    /**
     *
     */
    removeDimensions?: RemoveDimensions;
    /**
     *
     */
    removeElementsByAttr?: RemoveElementsByAttr;
    /**
     *
     */
    removeOffCanvasPaths?: RemoveOffCanvasPaths;
    /**
     *
     */
    removeRasterImages?: RemoveRasterImages;
    /**
     *
     */
    removeScripts?: RemoveScripts;
    /**
     *
     */
    removeStyleElement?: RemoveStyleElement;
    /**
     *
     */
    removeTitle?: RemoveTitle;
    /**
     *
     */
    removeViewBox?: RemoveViewBox;
    /**
     *
     */
    reusePaths?: ReusePaths;
    /**
     *
     */
    removeXMLNS?: RemoveXMLNS;
    /**
     *
     */
    removeDoctype?: RemoveDoctype;
    /**
     *
     */
    removeXMLProcInst?: RemoveXMLProcInst;
    /**
     *
     */
    removeComments?: RemoveComments;
    /**
     *
     */
    removeDeprecatedAttrs?: RemoveDeprecatedAttrs;
    /**
     *
     */
    removeMetadata?: RemoveMetadata;
    /**
     *
     */
    removeEditorsNSData?: RemoveEditorsNSData;
    /**
     *
     */
    cleanupAttrs?: CleanupAttrs;
    /**
     *
     */
    mergeStyles?: MergeStyles;
    /**
     *
     */
    inlineStyles?: InlineStyles;
    /**
     *
     */
    minifyStyles?: MinifyStyles;
    /**
     *
     */
    cleanupIds?: CleanupIds;
    /**
     *
     */
    removeUselessDefs?: RemoveUselessDefs;
    /**
     *
     */
    cleanupNumericValues?: CleanupNumericValues;
    /**
     *
     */
    convertColors?: ConvertColors;
    /**
     *
     */
    removeUnknownsAndDefaults?: RemoveUnknownsAndDefaults;
    /**
     *
     */
    removeNonInheritableGroupAttrs?: RemoveNonInheritableGroupAttrs;
    /**
     *
     */
    removeUselessStrokeAndFill?: RemoveUselessStrokeAndFill;
    /**
     *
     */
    cleanupEnableBackground?: CleanupEnableBackground;
    /**
     *
     */
    removeHiddenElems?: RemoveHiddenElems;
    /**
     *
     */
    removeEmptyText?: RemoveEmptyText;
    /**
     *
     */
    convertShapeToPath?: ConvertShapeToPath;
    /**
     *
     */
    convertEllipseToCircle?: ConvertEllipseToCircle;
    /**
     *
     */
    moveElemsAttrsToGroup?: MoveElemsAttrsToGroup;
    /**
     *
     */
    moveGroupAttrsToElems?: MoveGroupAttrsToElems;
    /**
     *
     */
    collapseGroups?: CollapseGroups;
    /**
     *
     */
    applyTransforms?: ApplyTransforms;
    /**
     *
     */
    convertPathData?: ConvertPathData;
    /**
     *
     */
    convertTransform?: ConvertTransform;
    /**
     *
     */
    removeEmptyAttrs?: RemoveEmptyAttrs;
    /**
     *
     */
    removeEmptyContainers?: RemoveEmptyContainers;
    /**
     *
     */
    removeUnusedNS?: RemoveUnusedNS;
    /**
     *
     */
    mergePaths?: MergePaths;
    /**
     *
     */
    sortAttrs?: SortAttrs;
    /**
     *
     */
    sortDefsChildren?: SortDefsChildren;
    /**
     *
     */
    removeDesc?: RemoveDesc;
    /**
     *
     */
    prefixIds?: PrefixIds;
    /**
     *
     */
    removeXlink?: RemoveXlink;
}

/**
 * Removes `<script>` elements, event attributes, and javascript `href`s from the document.
 *
 * This can help remove the risk of Cross-site scripting (XSS) attacks.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * It\'s likely to break interactive documents.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveScripts = boolean;

/**
 * Removes `<metadata>` from the document.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveMetadata = boolean;

/**
 * Removes empty `<text>` and `<tspan>` elements. Removes `<tref>` elements that don\'t
 * reference anything within the document.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface RemoveEmptyText {
    /**
     * Whether to remove empty text elements.
     */
    text?: boolean;
    /**
     * Whether to remove empty tspan elements.
     */
    tspan?: boolean;
    /**
     * Whether to remove useless tref elements.
     *
     * `tref` is deprecated and generally unsupported by browsers.
     */
    tref?: boolean;
}

/**
 * Removes `xmlns` prefixed elements that are never referenced by a qualified name.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveUnusedNS = boolean;

/**
 * Removes all `<style>` elements from the document.
 *
 * # Correctness
 *
 * This job is likely to visually affect documents with style elements in them.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveStyleElement = boolean;

/**
 * Removes the xml declaration from the document.
 *
 * # Correctness
 *
 * This job may affect clients which expect XML (not SVG) and can\'t detect the MIME-type
 * as `image/svg+xml`
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveXMLProcInst = boolean;

/**
 * Removes container elements with no functional children or meaningful attributes.
 *
 * # Correctness
 *
 * This job shouldn\'t visually change the document. Removing whitespace may have
 * an effect on `inline` or `inline-block` elements.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveEmptyContainers = boolean;

/**
 * Removes elements and attributes that are not expected in an SVG document. Removes
 * attributes that are not expected on a given element. Removes attributes that are
 * the default for a given element. Removes elements that are not expected as a child
 * for a given element.
 *
 * # Differences to SVGO
 *
 * SVGO will avoid removing `<tspan>` from `<a>`, whereas we will remove it.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface RemoveUnknownsAndDefaults {
    /**
     * Whether to remove elements that are unknown or unknown for it\'s parent element.
     */
    unknownContent?: boolean;
    /**
     * Whether to remove attributes that are unknown or unknown for it\'s element.
     */
    unknownAttrs?: boolean;
    /**
     * Whether to remove attributes that are equivalent to the default for it\'s element.
     */
    defaultAttrs?: boolean;
    /**
     * Whether to remove xml declarations equivalent to the default.
     */
    defaultMarkupDeclarations?: boolean;
    /**
     * Whether to remove attributes equivalent to it\'s inherited value.
     */
    uselessOverrides?: boolean;
    /**
     * Whether to keep attributes prefixed with `data-`
     */
    keepDataAttrs?: boolean;
    /**
     * Whether to keep attributes prefixed with `aria-`
     */
    keepAriaAttrs?: boolean;
    /**
     * Whether to keep the `role` attribute
     */
    keepRoleAttr?: boolean;
}

/**
 * Runs a series of checks to more confidently be sure the document won\'t break
 * due to unsupported/unstable features.
 *
 * # Errors
 *
 * When `fail_fast` is given, the job will fail if it finds any content which
 * may cause the document to break with optimisations.
 */
export interface Precheck {
    /**
     * Whether to exit with an error instead of a log
     */
    failFast?: boolean;
    /**
     * Whether to run thorough pre-clean checks as to maintain document correctness
     * similar to [svgcleaner](https://github.com/RazrFalcon/svgcleaner)
     */
    precleanChecks?: boolean;
}

/**
 * Merge multiple paths into one
 *
 * # Differences to SVGO
 *
 * There\'s no need to specify precision or spacing for path serialization.
 *
 * # Correctness
 *
 * By default this job should never visually change the document.
 *
 * Running with `force` may cause intersecting paths to be incorrectly merged.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface MergePaths {
    /**
     * Whether to merge paths despite intersections
     */
    force?: boolean;
}

/**
 * For duplicate `<path>` elements, replaces it with a `<use>` that references a single
 * `<path>` definition.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * If a path has an invalid id.
 */
export type ReusePaths = boolean;

/**
 * Removes doctype definitions from the document.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveDoctype = boolean;

/**
 * Apply transformations of a `transform` attribute to the path data, removing the `transform`
 * in the process.
 *
 * # Differences to SVGO
 *
 * In SVGO this job cannot be enabled individually; it always runs with `convertPathData`.
 *
 * # Correctness
 *
 * By default this job should never visually change the document.
 *
 * When specifying a precision there may be rounding errors affecting the accuracy of documents.
 *
 * When specifying to apply to apply transforms to a stroked path the stroke may be visually
 * warped when compared to the original.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface ApplyTransforms {
    /**
     * The level of precising at which to round transforms applied to the path data.
     */
    transformPrecision?: number;
    /**
     * Whether or not to apply transforms to paths with a stroke.
     */
    applyTransformsStroked?: boolean;
}

/**
 * Removes hidden or invisible elements from the document.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * Animations on removed element may end up breaking.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface RemoveHiddenElems {
    /**
     * Whether to remove elements with `visibility` set to `hidden`
     */
    isHidden?: boolean;
    /**
     * Whether to remove elements with `display` set to `none`
     */
    displayNone?: boolean;
    /**
     * Whether to remove elements with `opacity` set to `0`
     */
    opacityZero?: boolean;
    /**
     * Whether to remove `<circle>` with `radius` set to `0`
     */
    circleRZero?: boolean;
    /**
     * Whether to remove `<ellipse>` with `rx` set to `0`
     */
    ellipseRxZero?: boolean;
    /**
     * Whether to remove `<ellipse>` with `ry` set to `0`
     */
    ellipseRyZero?: boolean;
    /**
     * Whether to remove `<rect>` with `width` set to `0`
     */
    rectWidthZero?: boolean;
    /**
     * Whether to remove `<rect>` with `height` set to `0`
     */
    rectHeightZero?: boolean;
    /**
     * Whether to remove `<pattern>` with `width` set to `0`
     */
    patternWidthZero?: boolean;
    /**
     * Whether to remove `<pattern>` with `height` set to `0`
     */
    patternHeightZero?: boolean;
    /**
     * Whether to remove `<image>` with `width` set to `0`
     */
    imageWidthZero?: boolean;
    /**
     * Whether to remove `<image>` with `height` set to `0`
     */
    imageHeightZero?: boolean;
    /**
     * Whether to remove `<path>` with empty `d`
     */
    pathEmptyD?: boolean;
    /**
     * Whether to remove `<polyline>` with empty `points`
     */
    polylineEmptyPoints?: boolean;
    /**
     * Whether to remove `<polygon>` with empty `points`
     */
    polygonEmptyPoints?: boolean;
}

/**
 * Converts presentation attributes in element styles to the equivalent XML attribute.
 *
 * Presentation attributes can be used in both attributes and styles, but in most cases it\'ll take fewer
 * bytes to use attributes. Consider the following:
 *
 * ```xml
 * <rect width=\"100\" height=\"100\" style=\"fill:red\"/>
 * <!-- vs -->
 * <rect width=\"100\" height=\"100\" fill=\"red\"/>
 * ```
 *
 * However, because the `style` attribute doesn\'t require quotes between values, given enough
 * presentation attributes, it can increase the size of the document.
 *
 * ```xml
 * <rect width=\"100\" height=\"100\" style=\"fill:red;opacity:.5;stroke-dasharray:1;stroke:blue;stroke-opacity:.5\"/>
 * <!-- vs -->
 * <rect width=\"100\" height=\"100\" fill=\"red\" opacity=\".5\" stroke-dasharray=\"1\" stroke=\"blue\" stroke-opacity=\".5\"/>
 * ```
 *
 * # Differences to SVGO
 *
 * Unlike SVGO this job doesn\'t attempt to cleanup broken style attributes.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface ConvertStyleToAttrs {
    /**
     * Whether to always keep `!important` styles.
     */
    keepImportant?: boolean;
}

/**
 * Removes useless `stroke` and `fill` attributes
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface RemoveUselessStrokeAndFill {
    /**
     * Whether to remove redundant strokes
     */
    stroke?: boolean;
    /**
     * Whether to remove redundant fills
     */
    fill?: boolean;
    /**
     * Whether to remove elements with no stroke or fill
     */
    removeNone?: boolean;
}

/**
 * Sorts attributes into a predictable order.
 *
 * This doesn\'t affect the size of a document but will likely improve readability
 * and compression of the document.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface SortAttrs {
    /**
     * A list of attributes in a given order.
     */
    order?: string[];
    /**
     * The method for ordering xmlns attributes
     */
    xmlnsOrder?: XMLNSOrder;
}

/**
 * The method for ordering xmlns attributes
 */
export type XMLNSOrder = "alphabetical" | "front";

/**
 * Removes the `<title>` element from the document.
 *
 * This may affect the accessibility of documents, where the title is used
 * to describe a non-decorative SVG.
 *
 * # Correctness
 *
 * This job may visually change documents with images inlined in them.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveTitle = boolean;

/**
 * Removes the `viewBox` attribute when it matches the `width` and `height`.
 *
 * # Correctness
 *
 * This job should never visually change the document but may affect how the document
 * scales in applications.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveViewBox = boolean;

/**
 * Removes the `xmlns` attribute from `<svg>`.
 *
 * This can be useful for SVGs that will be inlined.
 *
 * # Correctness
 *
 * This job may break document when used outside of HTML.
 *
 * This may cause issues if the XMLNS doesn\'t reference the SVG namespace.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveXMLNS = boolean;

/**
 * Removes empty attributes from elements when safe to do so.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveEmptyAttrs = boolean;

/**
 * Rounds number and removes default `px` unit in attributes specified with number lists.
 *
 * # Correctness
 *
 * Rounding errors may cause slight changes in visual appearance.
 *
 * # Errors
 *
 * When a float-precision greater than the maximum is given.
 */
export interface CleanupListOfValues {
    /**
     * Number of decimal places to round floating point numbers to, to a maximum of 5.
     */
    floatPrecision?: number;
    /**
     * Whether to trim leading zeros.
     */
    leadingZero?: boolean;
    /**
     * Whether to remove `px` from a number\'s unit.
     */
    defaultPx?: boolean;
    /**
     * Whether to convert absolute units like `cm` and `in` to `px`.
     */
    convertToPx?: boolean;
}

/**
 * Rounds number and removes default `px` unit in attributes specified with a number number.
 *
 * # Correctness
 *
 * Rounding errors may cause slight changes in visual appearance.
 *
 * # Errors
 *
 * When a float-precision greater than the maximum is given.
 */
export interface CleanupNumericValues {
    /**
     * Number of decimal places to round floating point numbers to, to a maximum of 5.
     */
    floatPrecision?: number;
    /**
     * Whether to trim leading zeros.
     */
    leadingZero?: boolean;
    /**
     * Whether to remove `px` from a number\'s unit.
     */
    defaultPx?: boolean;
    /**
     * Whether to convert absolute units like `cm` and `in` to `px`.
     */
    convertToPx?: boolean;
}

/**
 * Removes redundant whitespace from attribute values.
 *
 * # Correctness
 *
 * By default any whitespace is cleaned up. This shouldn\'t affect anything within the SVG
 * but may affect elements within `<foreignObject />`, which is treated as HTML.
 *
 * For example, whitespace has an effect when between `inline` and `inline-block` elements.
 * See [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace#spaces_in_between_inline_and_inline-block_elements) for more information.
 *
 * In any other case, it should never affect the appearance of the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface CleanupAttrs {
    /**
     * Whether to replace `\'\\n\'` with `\' \'`.
     */
    newlines?: boolean;
    /**
     * Whether to remove whitespace from each end of the value
     */
    trim?: boolean;
    /**
     * Whether to replace multiple whitespace characters with a single `\' \'`.
     */
    spaces?: boolean;
}

/**
 * How the type will be converted.
 */
export type Method = "lightning" | "currentColor";

/**
 * Converts color references to their shortest equivalent.
 *
 * Colors are minified using lightningcss\' [minification](https://lightningcss.dev/minification.html#minify-colors).
 *
 * # Differences to SVGO
 *
 * There\'s fewer options for colour conversion in exchange for more effective conversions.
 *
 * # Correctness
 *
 * By default this job should never visually change the document.
 *
 * If the [`Method::CurrentColor`] is used all colours will inherit their text colour, which
 * may be different to original.
 *
 * # Errors
 *
 * If lightningcss fails to parse or serialize CSS values.
 */
export interface ConvertColors {
    /**
     * Specifies how colours should be converted.
     */
    method?: Method;
}

/**
 * Removes `width` and `height` from the `<svg>` and replaces it with `viewBox` if missing.
 *
 * This job is the opposite of [`super::RemoveViewBox`] and should be disabled before
 * using this one.
 *
 * # Correctness
 *
 * This job may affect the appearance of the document if the width/height does not match
 * the view-box.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveDimensions = boolean;

/**
 * Move an element\'s attributes to it\'s enclosing group.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type MoveElemsAttrsToGroup = boolean;

/**
 * Adds to the `class` attribute of the root `<svg>` element, omitting duplicates
 *
 * # Differences to SVGO
 *
 * The order of CSS classes may not be applied in the order given.
 *
 * # Examples
 *
 * Use with a list of classes
 *
 * ```
 * use oxvg_optimiser::{Jobs, AddClassesToSVGElement};
 *
 * let jobs = Jobs {
 *   add_classes_to_s_v_g_element: Some(AddClassesToSVGElement {
 *     class_names: Some(vec![String::from(\"foo\"), String::from(\"bar\")]),
 *     ..AddClassesToSVGElement::default()
 *   }),
 *   ..Jobs::none()
 * };
 * ```
 *
 * Use with a class string
 *
 * ```
 * use oxvg_optimiser::{Jobs, AddClassesToSVGElement};
 *
 * let jobs = Jobs {
 *   add_classes_to_s_v_g_element: Some(AddClassesToSVGElement {
 *     class_name: Some(String::from(\"foo bar\")),
 *     ..AddClassesToSVGElement::default()
 *   }),
 *   ..Jobs::none()
 * };
 * ```
 *
 *
 * # Correctness
 *
 * This job may visually change documents if an added classname causes it to be
 * selected by CSS.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface AddClassesToSVGElement {
    /**
     * Adds each class to the `class` attribute.
     */
    classNames?: string[];
    /**
     * Adds the classes to the `class` attribute, removing any whitespace between each. This option
     * is ignored if `class_names` is provided.
     */
    className?: string;
}

/**
 * Removes attributes from elements that match a selector.
 *
 * # Correctness
 *
 * Removing attributes may visually change the document if they\'re
 * presentation attributes or selected with CSS.
 *
 * # Errors
 *
 * If the selector fails to parse.
 */
export type RemoveAttributesBySelector = Selector[];

/**
 * A selector and set of attributes to remove.
 */
export interface Selector {
    /**
     * A CSS selector.
     */
    selector: string;
    /**
     * A list of qualified attribute names.
     */
    attributes: string[];
}

/**
 * Adds attributes to SVG elements in the document. This is not an optimisation
 * and will increase the size of SVG documents.
 *
 * # Differences to SVGO
 *
 * It\'s not possible to set a *none* value to an attribute. Elements like
 * `<svg data-icon />` are valid in HTML but not XML, so it\'s only possible to create
 * an attribute like `<svg data-icon=\"\" />`.
 *
 * It\'s also not possible to create React-like syntax. In SVGO it\'s possible to define
 * an attribute as `{ \"key={value}\": undefined }` to produce an attribute like
 * `<svg key={value} />`, however in OXVG you have to provide a string value, so it\'s
 * output would look like `<svg key={value}=\"\" />`.
 *
 * # Examples
 *
 * Add an attribute with a prefix
 *
 * ```
 * use std::collections::BTreeMap;
 * use oxvg_optimiser::{Jobs, AddAttributesToSVGElement};
 *
 * let jobs = Jobs {
 *   add_attributes_to_s_v_g_element: Some(AddAttributesToSVGElement {
 *     attributes: BTreeMap::from([(String::from(\"prefix:local\"), String::from(\"value\"))]),
 *   }),
 *   ..Jobs::none()
 * };
 * ```
 *
 * # Correctness
 *
 * This job may visually change documents if the attribute is a presentation attribute
 * or selected via CSS.
 *
 * No validation is applied to provided attribute and may produce incorrect or invalid documents.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface AddAttributesToSVGElement {
    /**
     * Pairs of qualified names and attribute values that are assigned to the `svg`
     */
    attributes: Record<string, string>;
}

/**
 * Remove attributes on groups that won\'t be inherited by it\'s children.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveNonInheritableGroupAttrs = boolean;

/**
 * Prefix element ids and classnames with the filename or provided string. This
 * is useful for reducing the likelihood of conflicts when inlining SVGs.
 *
 * See [`super::CleanupIds`] for more details.
 *
 * # Differences to SVGO
 *
 * Custom generator functions are not supported.
 *
 * # Correctness
 *
 * Prefixing ids on inlined SVGs may affect scripting and CSS.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface PrefixIds {
    /**
     * Content to insert between the prefix and original value.
     */
    delim?: string;
    /**
     * A string or generator that resolves to a string
     */
    prefix?: string | boolean | null;
    /**
     * Whether to prefix ids
     */
    prefixIds?: boolean;
    /**
     * Whether to prefix classnames
     */
    prefixClassNames?: boolean;
}

/**
 * Merge multiple `<style>` elements into one
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type MergeStyles = boolean;

/**
 * Merges styles from a `<style>` element to the `style` attribute of matching elements.
 *
 * # Differences to SVGO
 *
 * Styles are minified via lightningcss when merged.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface InlineStyles {
    /**
     * If to only inline styles if the selector matches one element.
     */
    onlyMatchedOnce?: boolean;
    /**
     * If to remove the selector and styles from the stylesheet while inlining the styles. This
     * does not remove the selectors that did not match any elements.
     */
    removeMatchedSelectors?: boolean;
    /**
     * An array of media query conditions to use, such as `screen`. An empty string signifies all
     * selectors outside of a media query.
     * Using `[\"*\"]` will match all media-queries
     */
    useMqs?: string[];
    /**
     * What pseudo-classes and pseudo-elements to use. An empty string signifies all non-pseudo
     * classes and non-pseudo elements.
     * Using `[\"*\"]` will match all pseudo-elements and pseudo-classes.
     */
    usePseudos?: string[];
}

/**
 * Minify `<style>` elements with lightningcss
 *
 * # Differences to SVGO
 *
 * Unlike SVGO we don\'t use CSSO for optimisation, instead using lightningcss.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface MinifyStyles {
    /**
     * Whether to remove styles with no matching elements.
     */
    removeUnused?: boolean | "force";
}

/**
 * Converts paths found in `<path>`, `<glyph>`, and `<missing-glyph>` elements. Path
 * commands are used within the `d` attributes of these elements.
 *
 * The plugin runs the following process to reduce path length.
 *
 * - Convert all paths to relative
 * - Filter redundant commands
 * - Merge commands which can be represented as one
 * - Map commands to shorter form commands where possible
 * - Convert commands back to absolute when shorter than relative
 *
 * This plugin is best used with [`super::ApplyTransforms`] for increased optimisation.
 *
 * # Differences to SVGO
 *
 * In SVGO [`super::ApplyTransforms`] runs based on the `applyTransforms` option.
 *
 * Path data might result in slightly different values because of how Rust handles numbers.
 *  
 * # Correctness
 *
 * Rounding errors may result in slight visual differences.
 *
 */
export interface ConvertPathData {
    /**
     * Whether to remove redundant path commands.
     */
    removeUseless?: boolean;
    /**
     * Whether to round the radius of circular arcs when the effective change is under error bounds.
     */
    smartArcRounding?: boolean;
    /**
     * Whether to convert straight curves to lines
     */
    straightCurves?: boolean;
    /**
     * Whether to convert complex curves that look like cubic beziers (q) into them.
     */
    convertToQ?: boolean;
    /**
     * Whether to convert normal lines that move in one direction to a vertical or horizontal line command.
     */
    lineShorthands?: boolean;
    /**
     * Whether merge repeated commands into one.
     */
    collapseRepeated?: boolean;
    /**
     * Whether to convert complex curves that look like smooth curves into them.
     */
    curveSmoothShorthands?: boolean;
    /**
     * Whether to convert lines that close a curve to a close command (z).
     */
    convertToZ?: boolean;
    /**
     * Whether to always convert relative paths to absolute, even if larger.
     */
    forceAbsolutePath?: boolean;
    /**
     * Whether to weakly force absolute commands, when slightly suboptimal
     */
    negativeExtraSpace?: boolean;
    /**
     * Controls whether to convert from curves to arcs
     */
    makeArcs?: MakeArcs;
    /**
     * Number of decimal places to round to.
     *
     * Precisions larger than 20 will be treated as 0.
     */
    floatPrecision?: null | false | number;
    /**
     * Whether to convert from relative to absolute, when shorter.
     */
    utilizeAbsolute?: boolean;
}

/**
 * Sorts the children of `<defs>` into a predictable order.
 *
 * This doesn\'t affect the size of a document but will likely improve readability
 * and compression of the document.
 *
 * # Correctness
 *
 * This job may affect the document if selectors or scripts depend on ordering.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type SortDefsChildren = boolean;

/**
 * Removes inline JPEGs, PNGs, and GIFs from the document.
 *
 * # Correctness
 *
 * This job may visually change documents with images inlined in them.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type RemoveRasterImages = boolean;

/**
 * Remove elements by ID or classname
 *
 * # Correctness
 *
 * Removing arbitrary elements may affect the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export interface RemoveElementsByAttr {
    /**
     * Ids of elements to be removed
     */
    id?: string[];
    /**
     * Class-names of elements to be removed
     */
    class?: string[];
}

/**
 * Moves some of a group\'s attributes to the contained elements.
 *
 * # Correctness
 *
 * This job should never visually change the document.
 *
 * # Errors
 *
 * Never.
 *
 * If this job produces an error or panic, please raise an [issue](https://github.com/noahbald/oxvg/issues)
 */
export type MoveGroupAttrsToElems = boolean;

/**
 * When running calculations against arcs, the level of error tolerated
 */
export interface MakeArcs {
    /**
     * When calculating tolerance, controls the bound compared to error
     */
    threshold: number;
    /**
     * When calculating tolerance, controls the bound compared to the radius
     */
    tolerance: number;
}


export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly convertSvgoConfig: (a: number, b: number) => [number, number, number];
  readonly extend: (a: any, b: number) => any;
  readonly optimise: (a: number, b: number, c: number) => [number, number, number, number];
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_4: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
