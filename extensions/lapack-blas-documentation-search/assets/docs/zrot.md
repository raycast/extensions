```fortran
subroutine zrot (
        integer n,
        complex*16, dimension( * ) cx,
        integer incx,
        complex*16, dimension( * ) cy,
        integer incy,
        double precision c,
        complex*16 s
)
```

ZROT applies a plane rotation, where the cos (C) is real and the
sin (S) is complex, and the vectors CX and CY are complex.

## Parameters
N : INTEGER [in]
> The number of elements in the vectors CX and CY.

CX : COMPLEX\*16 array, dimension (N) [in,out]
> On input, the vector X.
> On output, CX is overwritten with C\*X + S\*Y.

INCX : INTEGER [in]
> The increment between successive values of CX.  INCX <> 0.

CY : COMPLEX\*16 array, dimension (N) [in,out]
> On input, the vector Y.
> On output, CY is overwritten with -CONJG(S)\*X + C\*Y.

INCY : INTEGER [in]
> The increment between successive values of CY.  INCX <> 0.

C : DOUBLE PRECISION [in]

S : COMPLEX\*16 [in]
> C and S define a rotation
> [  C          S  ]
> [ -conjg(S)   C  ]
> where C\*C + S\*CONJG(S) = 1.0.
