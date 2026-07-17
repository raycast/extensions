```fortran
subroutine clartg (
        complex(wp) f,
        complex(wp) g,
        real(wp) c,
        complex(wp) s,
        complex(wp) r
)
```

CLARTG generates a plane rotation so that

[  C         S  ] . [ F ]  =  [ R ]
[ -conjg(S)  C  ]   [ G ]     [ 0 ]

where C is real and C\*\*2 + |S|\*\*2 = 1.

The mathematical formulas used for C and S are

sgn(x) = {  x / |x|,   x != 0
{  1,         x  = 0

R = sgn(F) \* sqrt(|F|\*\*2 + |G|\*\*2)

C = |F| / sqrt(|F|\*\*2 + |G|\*\*2)

S = sgn(F) \* conjg(G) / sqrt(|F|\*\*2 + |G|\*\*2)

Special conditions:
If G=0, then C=1 and S=0.
If F=0, then C=0 and S is chosen so that R is real.

When F and G are real, the formulas simplify to C = F/R and
S = G/R, and the returned values of C, S, and R should be
identical to those returned by SLARTG.

The algorithm used to compute these quantities incorporates scaling
to avoid overflow or underflow in computing the square root of the
sum of squares.

This is the same routine CROTG fom BLAS1, except that
F and G are unchanged on return.

Below, wp=>sp stands for single precision from LA_CONSTANTS module.

## Parameters
F : COMPLEX(wp) [in]
> The first component of vector to be rotated.

G : COMPLEX(wp) [in]
> The second component of vector to be rotated.

C : REAL(wp) [out]
> The cosine of the rotation.

S : COMPLEX(wp) [out]
> The sine of the rotation.

R : COMPLEX(wp) [out]
> The nonzero component of the rotated vector.
