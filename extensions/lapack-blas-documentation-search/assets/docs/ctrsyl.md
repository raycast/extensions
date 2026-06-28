```fortran
subroutine ctrsyl (
        character trana,
        character tranb,
        integer isgn,
        integer m,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldc, * ) c,
        integer ldc,
        real scale,
        integer info
)
```

CTRSYL solves the complex Sylvester matrix equation:

op(A)\*X + X\*op(B) = scale\*C or
op(A)\*X - X\*op(B) = scale\*C,

where op(A) = A or A\*\*H, and A and B are both upper triangular. A is
M-by-M and B is N-by-N; the right hand side C and the solution X are
M-by-N; and scale is an output scale factor, set <= 1 to avoid
overflow in X.

## Parameters
TRANA : CHARACTER\*1 [in]
> Specifies the option op(A):
> = 'N': op(A) = A    (No transpose)
> = 'C': op(A) = A\*\*H (Conjugate transpose)

TRANB : CHARACTER\*1 [in]
> Specifies the option op(B):
> = 'N': op(B) = B    (No transpose)
> = 'C': op(B) = B\*\*H (Conjugate transpose)

ISGN : INTEGER [in]
> Specifies the sign in the equation:
> = +1: solve op(A)\*X + X\*op(B) = scale\*C
> = -1: solve op(A)\*X - X\*op(B) = scale\*C

M : INTEGER [in]
> The order of the matrix A, and the number of rows in the
> matrices X and C. M >= 0.

N : INTEGER [in]
> The order of the matrix B, and the number of columns in the
> matrices X and C. N >= 0.

A : COMPLEX array, dimension (LDA,M) [in]
> The upper triangular matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,M).

B : COMPLEX array, dimension (LDB,N) [in]
> The upper triangular matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

C : COMPLEX array, dimension (LDC,N) [in,out]
> On entry, the M-by-N right hand side matrix C.
> On exit, C is overwritten by the solution matrix X.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M)

SCALE : REAL [out]
> The scale factor, scale, set <= 1 to avoid overflow in X.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> = 1: A and B have common or very close eigenvalues; perturbed
> values were used to solve the equation (but the matrices
> A and B are unchanged).
