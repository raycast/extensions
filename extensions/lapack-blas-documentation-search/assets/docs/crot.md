```fortran
subroutine crot (
        integer n,
        complex, dimension( * ) cx,
        integer incx,
        complex, dimension( * ) cy,
        integer incy,
        real c,
        complex s
)
```

CROT applies a plane rotation, where the cos (C) is real and the
sin (S) is complex, and the vectors CX and CY are complex.

## Parameters
N : INTEGER [in]
> The number of elements in the vectors CX and CY.

CX : COMPLEX array, dimension (N) [in,out]
> On input, the vector X.
> On output, CX is overwritten with C\*X + S\*Y.

INCX : INTEGER [in]
> The increment between successive values of CX.  INCX <> 0.

CY : COMPLEX array, dimension (N) [in,out]
> On input, the vector Y.
> On output, CY is overwritten with -CONJG(S)\*X + C\*Y.

INCY : INTEGER [in]
> The increment between successive values of CY.  INCX <> 0.

C : REAL [in]

S : COMPLEX [in]
> C and S define a rotation
> [  C          S  ]
> [ -conjg(S)   C  ]
> where C\*C + S\*CONJG(S) = 1.0.
