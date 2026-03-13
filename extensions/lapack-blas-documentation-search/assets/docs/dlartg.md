```fortran
subroutine dlartg (
        real(wp) f,
        real(wp) g,
        real(wp) c,
        real(wp) s,
        real(wp) r
)
```

DLARTG generates a plane rotation so that

[  C  S  ]  .  [ F ]  =  [ R ]
[ -S  C  ]     [ G ]     [ 0 ]

where C\*\*2 + S\*\*2 = 1.

The mathematical formulas used for C and S are
R = sign(F) \* sqrt(F\*\*2 + G\*\*2)
C = F / R
S = G / R
Hence C >= 0. The algorithm used to compute these quantities
incorporates scaling to avoid overflow or underflow in computing the
square root of the sum of squares.

This version is discontinuous in R at F = 0 but it returns the same
C and S as ZLARTG for complex inputs (F,0) and (G,0).

This is a more accurate version of the BLAS1 routine DROTG,
with the following other differences:
F and G are unchanged on return.
If G=0, then C=1 and S=0.
If F=0 and (G .ne. 0), then C=0 and S=sign(1,G) without doing any
floating point operations (saves work in DBDSQR when
there are zeros on the diagonal).

Below, wp=>dp stands for double precision from LA_CONSTANTS module.

## Parameters
F : REAL(wp) [in]
> The first component of vector to be rotated.

G : REAL(wp) [in]
> The second component of vector to be rotated.

C : REAL(wp) [out]
> The cosine of the rotation.

S : REAL(wp) [out]
> The sine of the rotation.

R : REAL(wp) [out]
> The nonzero component of the rotated vector.
