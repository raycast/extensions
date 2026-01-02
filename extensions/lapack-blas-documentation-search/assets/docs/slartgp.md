```fortran
subroutine slartgp (
        real f,
        real g,
        real cs,
        real sn,
        real r
)
```

SLARTGP generates a plane rotation so that

[  CS  SN  ]  .  [ F ]  =  [ R ]   where CS\*\*2 + SN\*\*2 = 1.
[ -SN  CS  ]     [ G ]     [ 0 ]

This is a slower, more accurate version of the Level 1 BLAS routine SROTG,
with the following other differences:
F and G are unchanged on return.
If G=0, then CS=(+/-)1 and SN=0.
If F=0 and (G .ne. 0), then CS=0 and SN=(+/-)1.

The sign is chosen so that R >= 0.

## Parameters
F : REAL [in]
> The first component of vector to be rotated.

G : REAL [in]
> The second component of vector to be rotated.

CS : REAL [out]
> The cosine of the rotation.

SN : REAL [out]
> The sine of the rotation.

R : REAL [out]
> The nonzero component of the rotated vector.
> 
> This version has a few statements commented out for thread safety
> (machine parameters are computed on each entry). 10 feb 03, SJH.
