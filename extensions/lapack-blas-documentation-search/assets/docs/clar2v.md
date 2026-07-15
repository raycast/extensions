```fortran
subroutine clar2v (
        integer n,
        complex, dimension( * ) x,
        complex, dimension( * ) y,
        complex, dimension( * ) z,
        integer incx,
        real, dimension( * ) c,
        complex, dimension( * ) s,
        integer incc
)
```

CLAR2V applies a vector of complex plane rotations with real cosines
from both sides to a sequence of 2-by-2 complex Hermitian matrices,
defined by the elements of the vectors x, y and z. For i = 1,2,...,n

(       x(i)  z(i) ) :=
( conjg(z(i)) y(i) )

(  c(i) conjg(s(i)) ) (       x(i)  z(i) ) ( c(i) -conjg(s(i)) )
( -s(i)       c(i)  ) ( conjg(z(i)) y(i) ) ( s(i)        c(i)  )

## Parameters
N : INTEGER [in]
> The number of plane rotations to be applied.

X : COMPLEX array, dimension (1+(N-1)\*INCX) [in,out]
> The vector x; the elements of x are assumed to be real.

Y : COMPLEX array, dimension (1+(N-1)\*INCX) [in,out]
> The vector y; the elements of y are assumed to be real.

Z : COMPLEX array, dimension (1+(N-1)\*INCX) [in,out]
> The vector z.

INCX : INTEGER [in]
> The increment between elements of X, Y and Z. INCX > 0.

C : REAL array, dimension (1+(N-1)\*INCC) [in]
> The cosines of the plane rotations.

S : COMPLEX array, dimension (1+(N-1)\*INCC) [in]
> The sines of the plane rotations.

INCC : INTEGER [in]
> The increment between elements of C and S. INCC > 0.
