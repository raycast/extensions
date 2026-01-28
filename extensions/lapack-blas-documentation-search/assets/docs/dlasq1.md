```fortran
subroutine dlasq1 (
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        double precision, dimension( * ) work,
        integer info
)
```

DLASQ1 computes the singular values of a real N-by-N bidiagonal
matrix with diagonal D and off-diagonal E. The singular values
are computed to high relative accuracy, in the absence of
denormalization, underflow and overflow. The algorithm was first
presented in

by K. V.
Fernando and B. N. Parlett, Numer. Math., Vol-67, No. 2, pp. 191-230,
1994,

and the present implementation is described in , LAPACK Working Note.

## Parameters
N : INTEGER [in]
> The number of rows and columns in the matrix. N >= 0.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, D contains the diagonal elements of the
> bidiagonal matrix whose SVD is desired. On normal exit,
> D contains the singular values in decreasing order.

E : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, elements E(1:N-1) contain the off-diagonal elements
> of the bidiagonal matrix whose SVD is desired.
> On exit, E is overwritten.

WORK : DOUBLE PRECISION array, dimension (4\*N) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: the algorithm failed
> = 1, a split was marked by a positive value in E
> = 2, current block of Z not diagonalized after 100\*N
> iterations (in inner while loop)  On exit D and E
> represent a matrix with the same singular values
> which the calling subroutine could use to finish the
> computation, or even feed back into DLASQ1
> = 3, termination criterion of outer while loop not met
> (program created more than N unreduced blocks)
