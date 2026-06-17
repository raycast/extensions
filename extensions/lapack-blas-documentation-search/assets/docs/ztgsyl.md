```fortran
subroutine ztgsyl (
        character trans,
        integer ijob,
        integer m,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        complex*16, dimension( ldd, * ) d,
        integer ldd,
        complex*16, dimension( lde , * ) e,
        integer lde,
        complex*16, dimension( ldf, * ) f,
        integer ldf,
        double precision scale,
        double precision dif,
        complex*16, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer info
)
```

ZTGSYL solves the generalized Sylvester equation:

A \* R - L \* B = scale \* C            (1)
D \* R - L \* E = scale \* F

where R and L are unknown m-by-n matrices, (A, D), (B, E) and
(C, F) are given matrix pairs of size m-by-m, n-by-n and m-by-n,
respectively, with complex entries. A, B, D and E are upper
triangular (i.e., (A,D) and (B,E) in generalized Schur form).

The solution (R, L) overwrites (C, F). 0 <= SCALE <= 1
is an output scaling factor chosen to avoid overflow.

In matrix notation (1) is equivalent to solve Zx = scale\*b, where Z
is defined as

Z = [ kron(In, A)  -kron(B\*\*H, Im) ]        (2)
[ kron(In, D)  -kron(E\*\*H, Im) ],

Here Ix is the identity matrix of size x and X\*\*H is the conjugate
transpose of X. Kron(X, Y) is the Kronecker product between the
matrices X and Y.

If TRANS = 'C', y in the conjugate transposed system Z\*\*H \*y = scale\*b
is solved for, which is equivalent to solve for R and L in

A\*\*H \* R + D\*\*H \* L = scale \* C           (3)
R \* B\*\*H + L \* E\*\*H = scale \* -F

This case (TRANS = 'C') is used to compute an one-norm-based estimate
of Dif[(A,D), (B,E)], the separation between the matrix pairs (A,D)
and (B,E), using ZLACON.

If IJOB >= 1, ZTGSYL computes a Frobenius norm-based estimate of
Dif[(A,D),(B,E)]. That is, the reciprocal of a lower bound on the
reciprocal of the smallest singular value of Z.

This is a level-3 BLAS algorithm.

## Parameters
TRANS : CHARACTER\*1 [in]
> = 'N': solve the generalized sylvester equation (1).
> = 'C': solve the  system (3).

IJOB : INTEGER [in]
> Specifies what kind of functionality to be performed.
> =0: solve (1) only.
> =1: The functionality of 0 and 3.
> =2: The functionality of 0 and 4.
> =3: Only an estimate of Dif[(A,D), (B,E)] is computed.
> (look ahead strategy is used).
> =4: Only an estimate of Dif[(A,D), (B,E)] is computed.
> (ZGECON on sub-systems is used).
> Not referenced if TRANS = 'C'.

M : INTEGER [in]
> The order of the matrices A and D, and the row dimension of
> the matrices C, F, R and L.

N : INTEGER [in]
> The order of the matrices B and E, and the column dimension
> of the matrices C, F, R and L.

A : COMPLEX\*16 array, dimension (LDA, M) [in]
> The upper triangular matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1, M).

B : COMPLEX\*16 array, dimension (LDB, N) [in]
> The upper triangular matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1, N).

C : COMPLEX\*16 array, dimension (LDC, N) [in,out]
> On entry, C contains the right-hand-side of the first matrix
> equation in (1) or (3).
> On exit, if IJOB = 0, 1 or 2, C has been overwritten by
> the solution R. If IJOB = 3 or 4 and TRANS = 'N', C holds R,
> the solution achieved during the computation of the
> Dif-estimate.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1, M).

D : COMPLEX\*16 array, dimension (LDD, M) [in]
> The upper triangular matrix D.

LDD : INTEGER [in]
> The leading dimension of the array D. LDD >= max(1, M).

E : COMPLEX\*16 array, dimension (LDE, N) [in]
> The upper triangular matrix E.

LDE : INTEGER [in]
> The leading dimension of the array E. LDE >= max(1, N).

F : COMPLEX\*16 array, dimension (LDF, N) [in,out]
> On entry, F contains the right-hand-side of the second matrix
> equation in (1) or (3).
> On exit, if IJOB = 0, 1 or 2, F has been overwritten by
> the solution L. If IJOB = 3 or 4 and TRANS = 'N', F holds L,
> the solution achieved during the computation of the
> Dif-estimate.

LDF : INTEGER [in]
> The leading dimension of the array F. LDF >= max(1, M).

DIF : DOUBLE PRECISION [out]
> On exit DIF is the reciprocal of a lower bound of the
> reciprocal of the Dif-function, i.e. DIF is an upper bound of
> Dif[(A,D), (B,E)] = sigma-min(Z), where Z as in (2).
> IF IJOB = 0 or TRANS = 'C', DIF is not referenced.

SCALE : DOUBLE PRECISION [out]
> On exit SCALE is the scaling factor in (1) or (3).
> If 0 < SCALE < 1, C and F hold the solutions R and L, resp.,
> to a slightly perturbed system but the input matrices A, B,
> D and E have not been changed. If SCALE = 0, R and L will
> hold the solutions to the homogeneous system with C = F = 0.

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK > = 1.
> If IJOB = 1 or 2 and TRANS = 'N', LWORK >= max(1,2\*M\*N).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (M+N+2) [out]

INFO : INTEGER [out]
> =0: successful exit
> <0: If INFO = -i, the i-th argument had an illegal value.
> >0: (A, D) and (B, E) have common or very close
> eigenvalues.
