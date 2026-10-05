```fortran
subroutine ztrsyl3 (
        character trana,
        character tranb,
        integer isgn,
        integer m,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        double precision scale,
        double precision, dimension( ldswork, * ) swork,
        integer ldswork,
        integer info
)
```

ZTRSYL3 solves the complex Sylvester matrix equation:

op(A)\*X + X\*op(B) = scale\*C or
op(A)\*X - X\*op(B) = scale\*C,

where op(A) = A or A\*\*H, and  A and B are both upper triangular. A is
M-by-M and B is N-by-N; the right hand side C and the solution X are
M-by-N; and scale is an output scale factor, set <= 1 to avoid
overflow in X.

This is the block version of the algorithm.

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

A : COMPLEX\*16 array, dimension (LDA,M) [in]
> The upper triangular matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,M).

B : COMPLEX\*16 array, dimension (LDB,N) [in]
> The upper triangular matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

C : COMPLEX\*16 array, dimension (LDC,N) [in,out]
> On entry, the M-by-N right hand side matrix C.
> On exit, C is overwritten by the solution matrix X.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M)

SCALE : DOUBLE PRECISION [out]
> The scale factor, scale, set <= 1 to avoid overflow in X.

SWORK : DOUBLE PRECISION array, dimension (MAX(2, ROWS), [out]
> MAX(1,COLS)).
> On exit, if INFO = 0, SWORK(1) returns the optimal value ROWS
> and SWORK(2) returns the optimal COLS.

LDSWORK : INTEGER [in]
> LDSWORK >= MAX(2,ROWS), where ROWS = ((M + NB - 1) / NB + 1)
> and NB is the optimal block size.
> 
> If LDSWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal dimensions of the SWORK matrix,
> returns these values as the first and second entry of the SWORK
> matrix, and no error message related LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> = 1: A and B have common or very close eigenvalues; perturbed
> values were used to solve the equation (but the matrices
> A and B are unchanged).
