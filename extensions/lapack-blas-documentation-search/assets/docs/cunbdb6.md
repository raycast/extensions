```fortran
subroutine cunbdb6 (
        integer m1,
        integer m2,
        integer n,
        complex, dimension(*) x1,
        integer incx1,
        complex, dimension(*) x2,
        integer incx2,
        complex, dimension(ldq1,*) q1,
        integer ldq1,
        complex, dimension(ldq2,*) q2,
        integer ldq2,
        complex, dimension(*) work,
        integer lwork,
        integer info
)
```

CUNBDB6 orthogonalizes the column vector
X = [ X1 ]
[ X2 ]
with respect to the columns of
Q = [ Q1 ] .
[ Q2 ]
The columns of Q must be orthonormal. The orthogonalized vector will
be zero if and only if it lies entirely in the range of Q.

The projection is computed with at most two iterations of the
classical Gram-Schmidt algorithm, see
\* L. Giraud, J. Langou, M. Rozložník.
2002. CERFACS Technical Report No. TR/PA/02/33. URL:
https://www.cerfacs.fr/algor/reports/2002/TR_PA_02_33.pdf

## Parameters
M1 : INTEGER [in]
> The dimension of X1 and the number of rows in Q1. 0 <= M1.

M2 : INTEGER [in]
> The dimension of X2 and the number of rows in Q2. 0 <= M2.

N : INTEGER [in]
> The number of columns in Q1 and Q2. 0 <= N.

X1 : COMPLEX array, dimension (M1) [in,out]
> On entry, the top part of the vector to be orthogonalized.
> On exit, the top part of the projected vector.

INCX1 : INTEGER [in]
> Increment for entries of X1.

X2 : COMPLEX array, dimension (M2) [in,out]
> On entry, the bottom part of the vector to be
> orthogonalized. On exit, the bottom part of the projected
> vector.

INCX2 : INTEGER [in]
> Increment for entries of X2.

Q1 : COMPLEX array, dimension (LDQ1, N) [in]
> The top part of the orthonormal basis matrix.

LDQ1 : INTEGER [in]
> The leading dimension of Q1. LDQ1 >= M1.

Q2 : COMPLEX array, dimension (LDQ2, N) [in]
> The bottom part of the orthonormal basis matrix.

LDQ2 : INTEGER [in]
> The leading dimension of Q2. LDQ2 >= M2.

WORK : COMPLEX array, dimension (LWORK) [out]

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= N.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
